package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sort"
	"strings"
	"sync"
	"syscall"
	"time"
)

type EventType string

const (
	OrderCreated      EventType = "OrderCreated"
	PaymentAuthorized EventType = "PaymentAuthorized"
	PaymentFailed     EventType = "PaymentFailed"
	InventoryReserved EventType = "InventoryReserved"
	InventoryRejected EventType = "InventoryRejected"
	OrderConfirmed    EventType = "OrderConfirmed"
	OrderCancelled    EventType = "OrderCancelled"
	OrderShipped      EventType = "OrderShipped"
	OrderDelivered    EventType = "OrderDelivered"
)

type OrderStatus string

const (
	StatusEmpty             OrderStatus = ""
	StatusPending           OrderStatus = "pending"
	StatusPaymentAuthorized OrderStatus = "payment_authorized"
	StatusPaymentFailed     OrderStatus = "payment_failed"
	StatusInventoryReserved OrderStatus = "inventory_reserved"
	StatusInventoryRejected OrderStatus = "inventory_rejected"
	StatusConfirmed         OrderStatus = "confirmed"
	StatusCancelled         OrderStatus = "cancelled"
	StatusShipped           OrderStatus = "shipped"
	StatusDelivered         OrderStatus = "delivered"
)

type OrderItem struct {
	SKU            string `json:"sku"`
	Quantity       int    `json:"quantity"`
	UnitPriceCents int    `json:"unit_price_cents"`
}

type OrderEvent struct {
	EventID        string         `json:"event_id"`
	AggregateID    string         `json:"aggregate_id"`
	AggregateType  string         `json:"aggregate_type"`
	EventType      EventType      `json:"event_type"`
	Sequence       int            `json:"sequence"`
	GlobalPosition int            `json:"global_position"`
	SchemaVersion  int            `json:"schema_version"`
	OccurredAt     time.Time      `json:"occurred_at"`
	CorrelationID  string         `json:"correlation_id"`
	CausationID    *string        `json:"causation_id"`
	IdempotencyKey string         `json:"idempotency_key,omitempty"`
	Payload        map[string]any `json:"payload"`
}

type OutboxRecord struct {
	OutboxID    string    `json:"outbox_id"`
	EventID     string    `json:"event_id"`
	Topic       string    `json:"topic"`
	Status      string    `json:"status"`
	Attempts    int       `json:"attempts"`
	CreatedAt   time.Time `json:"created_at"`
	PublishedAt time.Time `json:"published_at,omitempty"`
}

type OrderAggregate struct {
	OrderID      string
	CustomerID   string
	Items        []OrderItem
	TotalCents   int
	Status       OrderStatus
	Version      int
	PaymentOK    bool
	InventoryOK  bool
	Compensation []string
}

func Fold(events []OrderEvent) (OrderAggregate, error) {
	agg := OrderAggregate{}
	last := 0
	for _, event := range events {
		if event.Sequence != last+1 {
			return agg, fmt.Errorf("event sequence gap at %s", event.EventID)
		}
		last = event.Sequence
		agg.OrderID = event.AggregateID
		agg.Version = event.Sequence
		switch event.EventType {
		case OrderCreated:
			agg.CustomerID = str(event.Payload["customer_id"])
			agg.TotalCents = int(num(event.Payload["total_cents"]))
			agg.Status = StatusPending
		case PaymentAuthorized:
			agg.PaymentOK = true
			agg.Status = StatusPaymentAuthorized
		case PaymentFailed:
			agg.Status = StatusPaymentFailed
		case InventoryReserved:
			agg.InventoryOK = true
			agg.Status = StatusInventoryReserved
		case InventoryRejected:
			agg.Status = StatusInventoryRejected
		case OrderConfirmed:
			agg.Status = StatusConfirmed
		case OrderCancelled:
			agg.Status = StatusCancelled
			if c, ok := event.Payload["compensation"].(string); ok && c != "" {
				agg.Compensation = append(agg.Compensation, c)
			}
		case OrderShipped:
			agg.Status = StatusShipped
		case OrderDelivered:
			agg.Status = StatusDelivered
		}
	}
	return agg, nil
}

type CommandResult struct {
	OrderID string      `json:"order_id"`
	Status  OrderStatus `json:"status"`
	EventID string      `json:"event_id"`
	Version int         `json:"version"`
}

type idemEntry struct {
	fingerprint string
	result      CommandResult
}

type EventStore struct {
	mu      sync.Mutex
	events  []OrderEvent
	byOrder map[string][]OrderEvent
	outbox  []OutboxRecord
	idem    map[string]idemEntry
	nextID  int
	clock   func() time.Time
}

func NewEventStore() *EventStore {
	return &EventStore{byOrder: map[string][]OrderEvent{}, idem: map[string]idemEntry{}, clock: time.Now}
}

func (s *EventStore) Append(orderID, key, correlation, fingerprint string, typ EventType, payload map[string]any, expected *int) (OrderEvent, *CommandResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if key == "" {
		return OrderEvent{}, nil, domainError("invalid_idempotency_key", "idempotency key is required")
	}
	if old, ok := s.idem[key]; ok {
		if old.fingerprint != fingerprint {
			return OrderEvent{}, nil, domainError("idempotency_conflict", "idempotency key reused with different command")
		}
		return OrderEvent{}, &old.result, nil
	}
	current := len(s.byOrder[orderID])
	if expected != nil && *expected != current {
		return OrderEvent{}, nil, domainError("concurrency_conflict", "expected version does not match current version")
	}
	s.nextID++
	e := OrderEvent{EventID: fmt.Sprintf("evt_%06d", s.nextID), AggregateID: orderID, AggregateType: "Order", EventType: typ, Sequence: current + 1, GlobalPosition: len(s.events) + 1, SchemaVersion: 1, OccurredAt: s.clock().UTC(), CorrelationID: correlation, IdempotencyKey: key, Payload: payload}
	s.events = append(s.events, e)
	s.byOrder[orderID] = append(s.byOrder[orderID], e)
	s.outbox = append(s.outbox, OutboxRecord{OutboxID: fmt.Sprintf("out_%06d", s.nextID), EventID: e.EventID, Topic: "orders.events", Status: "pending", CreatedAt: e.OccurredAt})
	result := CommandResult{OrderID: orderID, Status: statusAfter(typ), EventID: e.EventID, Version: e.Sequence}
	s.idem[key] = idemEntry{fingerprint: fingerprint, result: result}
	return e, nil, nil
}

func (s *EventStore) EventsFor(orderID string) []OrderEvent {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]OrderEvent(nil), s.byOrder[orderID]...)
}
func (s *EventStore) AllEvents() []OrderEvent {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]OrderEvent(nil), s.events...)
}
func (s *EventStore) Backlog() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	n := 0
	for _, r := range s.outbox {
		if r.Status != "published" {
			n++
		}
	}
	return n
}
func (s *EventStore) pending() []OrderEvent {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []OrderEvent{}
	for i := range s.outbox {
		if s.outbox[i].Status == "pending" {
			s.outbox[i].Status = "publishing"
			s.outbox[i].Attempts++
			out = append(out, s.events[s.outbox[i].EventIDIndex()-1])
		}
	}
	return out
}
func (r OutboxRecord) EventIDIndex() int { var n int; fmt.Sscanf(r.EventID, "evt_%06d", &n); return n }
func (s *EventStore) markPublished(eventID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.outbox {
		if s.outbox[i].EventID == eventID {
			s.outbox[i].Status = "published"
			s.outbox[i].PublishedAt = s.clock().UTC()
		}
	}
}

type PubSub struct {
	mu          sync.Mutex
	subscribers []chan OrderEvent
	failures    int
}

func NewPubSub() *PubSub { return &PubSub{} }
func (p *PubSub) Subscribe(buffer int) <-chan OrderEvent {
	ch := make(chan OrderEvent, buffer)
	p.mu.Lock()
	p.subscribers = append(p.subscribers, ch)
	p.mu.Unlock()
	return ch
}
func (p *PubSub) Publish(e OrderEvent) {
	p.mu.Lock()
	defer p.mu.Unlock()
	for _, ch := range p.subscribers {
		select {
		case ch <- e:
		default:
			p.failures++
		}
	}
}
func (p *PubSub) Failures() int { p.mu.Lock(); defer p.mu.Unlock(); return p.failures }

type ProjectionStore struct {
	mu         sync.Mutex
	summaries  map[string]OrderSummary
	histories  map[string][]OrderSummary
	checkpoint int
	applied    map[string]bool
}
type OrderSummary struct {
	OrderID             string      `json:"order_id"`
	CustomerID          string      `json:"customer_id"`
	Status              OrderStatus `json:"status"`
	TotalCents          int         `json:"total_cents"`
	Version             int         `json:"version"`
	LastEventID         string      `json:"last_event_id"`
	ProjectionUpdatedAt time.Time   `json:"projection_updated_at"`
}

func NewProjectionStore() *ProjectionStore {
	return &ProjectionStore{summaries: map[string]OrderSummary{}, histories: map[string][]OrderSummary{}, applied: map[string]bool{}}
}
func (p *ProjectionStore) Apply(e OrderEvent) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.applied[e.EventID] {
		return
	}
	p.applied[e.EventID] = true
	s := p.summaries[e.AggregateID]
	if e.EventType == OrderCreated {
		s = OrderSummary{OrderID: e.AggregateID, CustomerID: str(e.Payload["customer_id"]), TotalCents: int(num(e.Payload["total_cents"]))}
	}
	s.Status = statusAfter(e.EventType)
	s.Version = e.Sequence
	s.LastEventID = e.EventID
	s.ProjectionUpdatedAt = time.Now().UTC()
	p.summaries[e.AggregateID] = s
	p.histories[s.CustomerID] = upsertSummary(p.histories[s.CustomerID], s)
	if e.GlobalPosition > p.checkpoint {
		p.checkpoint = e.GlobalPosition
	}
}
func (p *ProjectionStore) Rebuild(events []OrderEvent) {
	p.mu.Lock()
	p.summaries = map[string]OrderSummary{}
	p.histories = map[string][]OrderSummary{}
	p.checkpoint = 0
	p.applied = map[string]bool{}
	p.mu.Unlock()
	for _, e := range events {
		p.Apply(e)
	}
}
func (p *ProjectionStore) Summary(id string) (OrderSummary, bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	s, ok := p.summaries[id]
	return s, ok
}
func (p *ProjectionStore) History(c string) []OrderSummary {
	p.mu.Lock()
	defer p.mu.Unlock()
	return append([]OrderSummary(nil), p.histories[c]...)
}
func (p *ProjectionStore) Lag(total int) int {
	p.mu.Lock()
	defer p.mu.Unlock()
	return total - p.checkpoint
}

type Service struct {
	store       *EventStore
	bus         *PubSub
	projections *ProjectionStore
	logger      *slog.Logger
}

func NewService() *Service {
	return &Service{store: NewEventStore(), bus: NewPubSub(), projections: NewProjectionStore(), logger: slog.New(slog.NewJSONHandler(os.Stdout, nil))}
}
func (s *Service) Create(customer, key string, items []OrderItem) (CommandResult, error) {
	if customer == "" || len(items) == 0 {
		return CommandResult{}, domainError("invalid_order", "customer and items are required")
	}
	total := 0
	for _, it := range items {
		if it.SKU == "" || it.Quantity < 1 || it.UnitPriceCents < 0 {
			return CommandResult{}, domainError("invalid_item", "invalid item")
		}
		total += it.Quantity * it.UnitPriceCents
	}
	id := "ord_" + shortHash(customer+key)
	payload := map[string]any{"customer_id": customer, "items": items, "total_cents": total}
	return s.append(id, key, nil, OrderCreated, payload)
}
func (s *Service) AuthorizePayment(id, payment string, ok bool, reason, key string, expected *int) (CommandResult, error) {
	if payment == "" {
		return CommandResult{}, domainError("invalid_payment", "payment id is required")
	}
	typ := PaymentAuthorized
	payload := map[string]any{"payment_id": payment}
	if !ok {
		typ = PaymentFailed
		payload["reason"] = reason
	}
	return s.lifecycle(id, key, expected, typ, payload)
}
func (s *Service) ReserveInventory(id, reservation string, ok bool, reason, key string, expected *int) (CommandResult, error) {
	if reservation == "" {
		return CommandResult{}, domainError("invalid_reservation", "reservation id is required")
	}
	typ := InventoryReserved
	payload := map[string]any{"reservation_id": reservation}
	if !ok {
		typ = InventoryRejected
		payload["reason"] = reason
	}
	return s.lifecycle(id, key, expected, typ, payload)
}
func (s *Service) Cancel(id, reason, key string, expected *int) (CommandResult, error) {
	if reason == "" {
		return CommandResult{}, domainError("invalid_reason", "reason is required")
	}
	return s.lifecycle(id, key, expected, OrderCancelled, map[string]any{"reason": reason})
}
func (s *Service) Ship(id, shipment, carrier, key string, expected *int) (CommandResult, error) {
	if shipment == "" || carrier == "" {
		return CommandResult{}, domainError("invalid_shipment", "shipment and carrier are required")
	}
	return s.lifecycle(id, key, expected, OrderShipped, map[string]any{"shipment_id": shipment, "carrier": carrier})
}
func (s *Service) Deliver(id, at, key string, expected *int) (CommandResult, error) {
	if at == "" {
		return CommandResult{}, domainError("invalid_delivery", "delivered_at is required")
	}
	return s.lifecycle(id, key, expected, OrderDelivered, map[string]any{"delivered_at": at})
}
func (s *Service) lifecycle(id, key string, expected *int, typ EventType, payload map[string]any) (CommandResult, error) {
	events := s.store.EventsFor(id)
	if len(events) == 0 {
		return CommandResult{}, domainError("order_not_found", "order not found")
	}
	agg, err := Fold(events)
	if err != nil {
		return CommandResult{}, err
	}
	if !canApply(agg, typ) {
		return CommandResult{}, domainError("invalid_transition", "transition is not allowed")
	}
	return s.append(id, key, expected, typ, payload)
}
func (s *Service) append(id, key string, expected *int, typ EventType, payload map[string]any) (CommandResult, error) {
	fp := fingerprint(id, typ, payload)
	e, old, err := s.store.Append(id, key, "corr_"+shortHash(key), fp, typ, payload, expected)
	if old != nil {
		return *old, nil
	}
	if err != nil {
		return CommandResult{}, err
	}
	s.logger.Info("event_appended", "order_id", id, "event_id", e.EventID, "event_type", e.EventType)
	s.PublishOutbox()
	return CommandResult{OrderID: id, Status: statusAfter(typ), EventID: e.EventID, Version: e.Sequence}, nil
}
func (s *Service) PublishOutbox() {
	for _, e := range s.store.pending() {
		s.bus.Publish(e)
		s.projections.Apply(e)
		s.reactSaga(e)
		s.store.markPublished(e.EventID)
		s.logger.Info("outbox_published", "order_id", e.AggregateID, "event_id", e.EventID, "event_type", e.EventType)
	}
}
func (s *Service) reactSaga(e OrderEvent) {
	if e.EventType != PaymentAuthorized && e.EventType != InventoryReserved && e.EventType != PaymentFailed && e.EventType != InventoryRejected {
		return
	}
	events := s.store.EventsFor(e.AggregateID)
	agg, _ := Fold(events)
	has := func(t EventType) bool {
		for _, ev := range events {
			if ev.EventType == t {
				return true
			}
		}
		return false
	}
	if agg.PaymentOK && agg.InventoryOK && !has(OrderConfirmed) {
		_, _ = s.append(e.AggregateID, "saga-confirm-"+e.AggregateID, nil, OrderConfirmed, map[string]any{"confirmed_by": "fulfillment_saga"})
	}
	if (e.EventType == PaymentFailed || e.EventType == InventoryRejected) && !has(OrderCancelled) {
		comp := ""
		if e.EventType == InventoryRejected && has(PaymentAuthorized) {
			comp = "release_payment"
		}
		_, _ = s.append(e.AggregateID, "saga-cancel-"+e.AggregateID, nil, OrderCancelled, map[string]any{"reason": "saga_compensation", "compensation": comp})
	}
}
func (s *Service) Replay() (int, time.Duration) {
	start := time.Now()
	events := s.store.AllEvents()
	s.projections.Rebuild(events)
	return len(events), time.Since(start)
}
func (s *Service) Health() map[string]any {
	return map[string]any{"status": "ok", "event_store": "ok", "outbox_backlog": s.store.Backlog(), "projection_lag_events": s.projections.Lag(len(s.store.AllEvents())), "projection_lag_ms": 0, "saga_backlog": 0, "subscriber_failures": s.bus.Failures()}
}

type apiError struct{ Code, Message string }

func (e apiError) Error() string         { return e.Message }
func domainError(code, msg string) error { return apiError{code, msg} }
func statusAfter(t EventType) OrderStatus {
	return map[EventType]OrderStatus{OrderCreated: StatusPending, PaymentAuthorized: StatusPaymentAuthorized, PaymentFailed: StatusPaymentFailed, InventoryReserved: StatusInventoryReserved, InventoryRejected: StatusInventoryRejected, OrderConfirmed: StatusConfirmed, OrderCancelled: StatusCancelled, OrderShipped: StatusShipped, OrderDelivered: StatusDelivered}[t]
}
func canApply(a OrderAggregate, t EventType) bool {
	switch t {
	case PaymentAuthorized, PaymentFailed, InventoryReserved, InventoryRejected:
		return a.Status != StatusCancelled && a.Status != StatusShipped && a.Status != StatusDelivered
	case OrderCancelled:
		return a.Status != StatusDelivered && a.Status != StatusCancelled
	case OrderShipped:
		return a.Status == StatusConfirmed
	case OrderDelivered:
		return a.Status == StatusShipped
	default:
		return true
	}
}
func upsertSummary(items []OrderSummary, s OrderSummary) []OrderSummary {
	for i := range items {
		if items[i].OrderID == s.OrderID {
			items[i] = s
			return items
		}
	}
	return append(items, s)
}
func shortHash(s string) string { h := sha256.Sum256([]byte(s)); return hex.EncodeToString(h[:])[:12] }
func fingerprint(id string, t EventType, p map[string]any) string {
	b, _ := json.Marshal(p)
	return id + string(t) + string(b)
}
func str(v any) string { s, _ := v.(string); return s }
func num(v any) float64 {
	switch n := v.(type) {
	case int:
		return float64(n)
	case float64:
		return n
	default:
		return 0
	}
}

func Router(svc *Service) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) { writeOK(w, http.StatusOK, svc.Health(), 0) })
	mux.HandleFunc("/orders", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		var req struct {
			CustomerID     string      `json:"customer_id"`
			IdempotencyKey string      `json:"idempotency_key"`
			Items          []OrderItem `json:"items"`
		}
		decode(r, &req)
		res, err := svc.Create(req.CustomerID, req.IdempotencyKey, req.Items)
		writeResult(w, http.StatusCreated, res, err)
	})
	mux.HandleFunc("/customers/", func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) == 3 && parts[2] == "orders" {
			writeOK(w, 200, map[string]any{"items": svc.projections.History(parts[1]), "next_cursor": nil}, 0)
			return
		}
		http.NotFound(w, r)
	})
	mux.HandleFunc("/admin/projections/replay", func(w http.ResponseWriter, r *http.Request) {
		n, d := svc.Replay()
		writeOK(w, 202, map[string]any{"replay_id": "replay_latest", "status": "completed", "events_processed": n, "duration_ms": d.Milliseconds()}, 0)
	})
	mux.HandleFunc("/orders/", func(w http.ResponseWriter, r *http.Request) { handleOrder(w, r, svc) })
	return mux
}

func handleOrder(w http.ResponseWriter, r *http.Request, svc *Service) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 {
		http.NotFound(w, r)
		return
	}
	id := parts[1]
	if len(parts) == 2 && r.Method == http.MethodGet {
		s, ok := svc.projections.Summary(id)
		if !ok {
			writeErr(w, 404, "projection_not_found", "projection not found")
			return
		}
		writeOK(w, 200, s, s.Version)
		return
	}
	if len(parts) == 3 && parts[2] == "events" {
		events := svc.store.EventsFor(id)
		if len(events) == 0 {
			writeErr(w, 404, "order_not_found", "order not found")
			return
		}
		sort.Slice(events, func(i, j int) bool { return events[i].Sequence < events[j].Sequence })
		writeOK(w, 200, map[string]any{"order_id": id, "events": events}, 0)
		return
	}
	var m map[string]any
	decode(r, &m)
	key := str(m["idempotency_key"])
	exp := expected(m)
	var res CommandResult
	var err error
	switch parts[2] {
	case "authorize-payment":
		res, err = svc.AuthorizePayment(id, str(m["payment_id"]), m["authorized"] == true, str(m["reason"]), key, exp)
	case "reserve-inventory":
		res, err = svc.ReserveInventory(id, str(m["reservation_id"]), m["reserved"] == true, str(m["reason"]), key, exp)
	case "cancel":
		res, err = svc.Cancel(id, str(m["reason"]), key, exp)
	case "ship":
		res, err = svc.Ship(id, str(m["shipment_id"]), str(m["carrier"]), key, exp)
	case "deliver":
		res, err = svc.Deliver(id, str(m["delivered_at"]), key, exp)
	default:
		http.NotFound(w, r)
		return
	}
	writeResult(w, 200, res, err)
}
func expected(m map[string]any) *int {
	if v, ok := m["expected_version"]; ok {
		n := int(num(v))
		return &n
	}
	return nil
}
func decode(r *http.Request, dst any) { _ = json.NewDecoder(r.Body).Decode(dst) }
func writeResult(w http.ResponseWriter, code int, r CommandResult, err error) {
	if err != nil {
		var ae apiError
		if errors.As(err, &ae) {
			status := 400
			if ae.Code == "order_not_found" {
				status = 404
			} else if strings.Contains(ae.Code, "conflict") || ae.Code == "invalid_transition" {
				status = 409
			}
			writeErr(w, status, ae.Code, ae.Message)
			return
		}
		writeErr(w, 500, "internal_error", err.Error())
		return
	}
	writeOK(w, code, map[string]any{"order_id": r.OrderID, "status": r.Status, "event_id": r.EventID}, r.Version)
}
func writeOK(w http.ResponseWriter, code int, data any, version int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "data": data, "metadata": map[string]any{"correlation_id": "corr_http", "aggregate_version": version}})
}
func writeErr(w http.ResponseWriter, code int, c, m string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": map[string]any{"code": c, "message": m, "details": map[string]any{}}, "metadata": map[string]any{"correlation_id": "corr_http"}})
}

func main() {
	svc := NewService()
	srv := &http.Server{Addr: ":8080", Handler: Router(svc)}
	go func() {
		slog.Info("listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server_failed", "error", err)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
