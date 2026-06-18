package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCreateOrderAppendsPublishesProjectsAndIsIdempotent(t *testing.T) {
	svc := NewService()
	res, err := svc.Create("cust_1", "create-key", []OrderItem{{SKU: "SKU-1", Quantity: 2, UnitPriceCents: 500}})
	if err != nil {
		t.Fatal(err)
	}
	if res.Status != StatusPending || res.Version != 1 {
		t.Fatalf("unexpected result: %+v", res)
	}
	if len(svc.store.EventsFor(res.OrderID)) != 1 {
		t.Fatal("expected one event")
	}
	if svc.store.Backlog() != 0 {
		t.Fatal("outbox should be published")
	}
	if summary, ok := svc.projections.Summary(res.OrderID); !ok || summary.TotalCents != 1000 {
		t.Fatalf("projection not updated: %+v %v", summary, ok)
	}
	again, err := svc.Create("cust_1", "create-key", []OrderItem{{SKU: "SKU-1", Quantity: 2, UnitPriceCents: 500}})
	if err != nil || again.OrderID != res.OrderID || len(svc.store.EventsFor(res.OrderID)) != 1 {
		t.Fatalf("idempotency failed: %+v %v", again, err)
	}
}

func TestValidationConcurrencyAndInvalidTransitions(t *testing.T) {
	svc := NewService()
	if _, err := svc.Create("cust", "bad", nil); err == nil {
		t.Fatal("empty items should fail")
	}
	res, _ := svc.Create("cust", "create", []OrderItem{{SKU: "S", Quantity: 1, UnitPriceCents: 1}})
	stale := 0
	if _, err := svc.AuthorizePayment(res.OrderID, "pay", true, "", "pay", &stale); err == nil {
		t.Fatal("stale version should fail")
	}
	if _, err := svc.Ship(res.OrderID, "ship", "ups", "ship", nil); err == nil {
		t.Fatal("shipping pending order should fail")
	}
	if len(svc.store.EventsFor(res.OrderID)) != 1 {
		t.Fatal("failed commands must not append")
	}
}

func TestSagaConfirmsAndCancelsIdempotently(t *testing.T) {
	svc := NewService()
	res, _ := svc.Create("cust", "create", []OrderItem{{SKU: "S", Quantity: 1, UnitPriceCents: 1}})
	_, _ = svc.AuthorizePayment(res.OrderID, "pay", true, "", "pay", nil)
	_, _ = svc.ReserveInventory(res.OrderID, "res", true, "", "res", nil)
	events := svc.store.EventsFor(res.OrderID)
	agg, _ := Fold(events)
	if agg.Status != StatusConfirmed {
		t.Fatalf("expected confirmed, got %s", agg.Status)
	}
	svc.reactSaga(events[len(events)-1])
	if len(svc.store.EventsFor(res.OrderID)) != 4 {
		t.Fatal("duplicate saga wakeup appended duplicate event")
	}

	fail, _ := svc.Create("cust", "create2", []OrderItem{{SKU: "S", Quantity: 1, UnitPriceCents: 1}})
	_, _ = svc.AuthorizePayment(fail.OrderID, "pay2", false, "declined", "pay-fail", nil)
	agg, _ = Fold(svc.store.EventsFor(fail.OrderID))
	if agg.Status != StatusCancelled {
		t.Fatalf("expected saga cancellation, got %s", agg.Status)
	}
}

func TestReplayRebuildsProjectionsAndHealthReportsLag(t *testing.T) {
	svc := NewService()
	res, _ := svc.Create("cust", "create", []OrderItem{{SKU: "S", Quantity: 3, UnitPriceCents: 7}})
	svc.projections = NewProjectionStore()
	if _, ok := svc.projections.Summary(res.OrderID); ok {
		t.Fatal("projection should be cleared")
	}
	n, _ := svc.Replay()
	if n != 1 {
		t.Fatalf("expected one replayed event, got %d", n)
	}
	if summary, ok := svc.projections.Summary(res.OrderID); !ok || summary.TotalCents != 21 {
		t.Fatalf("bad replay summary: %+v", summary)
	}
	if svc.Health()["projection_lag_events"].(int) != 0 {
		t.Fatal("expected zero lag")
	}
}

func TestHTTPContract(t *testing.T) {
	svc := NewService()
	server := httptest.NewServer(Router(svc))
	defer server.Close()
	body := bytes.NewBufferString(`{"customer_id":"cust_http","idempotency_key":"http-create","items":[{"sku":"SKU","quantity":1,"unit_price_cents":12}]}`)
	resp, err := http.Post(server.URL+"/orders", "application/json", body)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status %d", resp.StatusCode)
	}
	var envelope struct {
		Data struct {
			OrderID string `json:"order_id"`
		} `json:"data"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&envelope)
	get, _ := http.Get(server.URL + "/orders/" + envelope.Data.OrderID + "/events")
	if get.StatusCode != http.StatusOK {
		t.Fatalf("events status %d", get.StatusCode)
	}
	health, _ := http.Get(server.URL + "/health")
	if health.StatusCode != http.StatusOK {
		t.Fatalf("health status %d", health.StatusCode)
	}
}

func TestFullLifecycleAndReadAPIs(t *testing.T) {
	svc := NewService()
	created, _ := svc.Create("cust_full", "create-full", []OrderItem{{SKU: "S", Quantity: 1, UnitPriceCents: 10}})
	_, _ = svc.AuthorizePayment(created.OrderID, "pay", true, "", "pay-full", nil)
	_, _ = svc.ReserveInventory(created.OrderID, "res", true, "", "res-full", nil)
	confirmed, _ := Fold(svc.store.EventsFor(created.OrderID))
	if confirmed.Status != StatusConfirmed {
		t.Fatalf("expected confirmed, got %s", confirmed.Status)
	}
	_, _ = svc.Ship(created.OrderID, "ship", "ups", "ship-full", nil)
	_, _ = svc.Deliver(created.OrderID, "2026-06-17T12:00:00Z", "deliver-full", nil)
	final, _ := Fold(svc.store.EventsFor(created.OrderID))
	if final.Status != StatusDelivered {
		t.Fatalf("expected delivered, got %s", final.Status)
	}
	if _, err := svc.Cancel(created.OrderID, "too_late", "cancel-delivered", nil); err == nil {
		t.Fatal("delivered order should not cancel")
	}
	if len(svc.projections.History("cust_full")) != 1 {
		t.Fatal("expected customer history projection")
	}
}

func TestPubSubAndHTTPErrorPaths(t *testing.T) {
	svc := NewService()
	ch := svc.bus.Subscribe(1)
	created, err := svc.Create("cust_sub", "create-sub", []OrderItem{{SKU: "S", Quantity: 1, UnitPriceCents: 1}})
	if err != nil {
		t.Fatal(err)
	}
	select {
	case event := <-ch:
		if event.EventType != OrderCreated {
			t.Fatalf("unexpected event %s", event.EventType)
		}
	default:
		t.Fatal("subscriber did not receive event")
	}

	server := httptest.NewServer(Router(svc))
	defer server.Close()
	missing, _ := http.Get(server.URL + "/orders/missing/events")
	if missing.StatusCode != http.StatusNotFound {
		t.Fatalf("missing events status %d", missing.StatusCode)
	}
	projection, _ := http.Get(server.URL + "/orders/" + created.OrderID)
	if projection.StatusCode != http.StatusOK {
		t.Fatalf("projection status %d", projection.StatusCode)
	}
	history, _ := http.Get(server.URL + "/customers/cust_sub/orders")
	if history.StatusCode != http.StatusOK {
		t.Fatalf("history status %d", history.StatusCode)
	}
	replay, _ := http.Post(server.URL+"/admin/projections/replay", "application/json", bytes.NewBufferString(`{"projection":"all"}`))
	if replay.StatusCode != http.StatusAccepted {
		t.Fatalf("replay status %d", replay.StatusCode)
	}
}

func TestIdempotencyConflictAndInventoryCompensation(t *testing.T) {
	svc := NewService()
	_, err := svc.Create("cust", "same-key", []OrderItem{{SKU: "A", Quantity: 1, UnitPriceCents: 1}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Create("cust", "same-key", []OrderItem{{SKU: "B", Quantity: 1, UnitPriceCents: 1}}); err == nil {
		t.Fatal("expected idempotency conflict")
	}
	order, _ := svc.Create("cust", "comp-create", []OrderItem{{SKU: "S", Quantity: 1, UnitPriceCents: 1}})
	_, _ = svc.AuthorizePayment(order.OrderID, "pay", true, "", "comp-pay", nil)
	_, _ = svc.ReserveInventory(order.OrderID, "res", false, "no_stock", "comp-inv", nil)
	agg, _ := Fold(svc.store.EventsFor(order.OrderID))
	if agg.Status != StatusCancelled || len(agg.Compensation) != 1 || agg.Compensation[0] != "release_payment" {
		t.Fatalf("expected compensation cancellation, got %+v", agg)
	}
}

func TestStateMachineHelpersAndReplayIntegrity(t *testing.T) {
	if statusAfter(OrderDelivered) != StatusDelivered {
		t.Fatal("delivered status mapping failed")
	}
	if !canApply(OrderAggregate{Status: StatusPending}, PaymentAuthorized) {
		t.Fatal("pending order should accept payment result")
	}
	if canApply(OrderAggregate{Status: StatusCancelled}, InventoryReserved) {
		t.Fatal("cancelled order should reject inventory result")
	}
	if canApply(OrderAggregate{Status: StatusDelivered}, OrderCancelled) {
		t.Fatal("delivered order should reject cancellation")
	}
	items := upsertSummary(nil, OrderSummary{OrderID: "ord_1", Status: StatusPending})
	items = upsertSummary(items, OrderSummary{OrderID: "ord_1", Status: StatusConfirmed})
	if len(items) != 1 || items[0].Status != StatusConfirmed {
		t.Fatalf("upsert failed: %+v", items)
	}
	if _, err := Fold([]OrderEvent{{EventID: "evt_gap", AggregateID: "ord", EventType: OrderCreated, Sequence: 2}}); err == nil {
		t.Fatal("sequence gaps must fail replay")
	}
}

func TestHTTPLifecycleCommands(t *testing.T) {
	svc := NewService()
	server := httptest.NewServer(Router(svc))
	defer server.Close()
	createBody := bytes.NewBufferString(`{"customer_id":"cust_api","idempotency_key":"api-create","items":[{"sku":"SKU","quantity":1,"unit_price_cents":5}]}`)
	createdResp, _ := http.Post(server.URL+"/orders", "application/json", createBody)
	var envelope struct {
		Data struct {
			OrderID string `json:"order_id"`
		} `json:"data"`
	}
	_ = json.NewDecoder(createdResp.Body).Decode(&envelope)
	post := func(path, body string, want int) {
		resp, err := http.Post(server.URL+path, "application/json", bytes.NewBufferString(body))
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != want {
			t.Fatalf("%s status %d want %d", path, resp.StatusCode, want)
		}
	}
	post("/orders/"+envelope.Data.OrderID+"/authorize-payment", `{"payment_id":"pay_api","authorized":true,"idempotency_key":"api-pay"}`, http.StatusOK)
	post("/orders/"+envelope.Data.OrderID+"/reserve-inventory", `{"reservation_id":"res_api","reserved":true,"idempotency_key":"api-res"}`, http.StatusOK)
	post("/orders/"+envelope.Data.OrderID+"/ship", `{"shipment_id":"ship_api","carrier":"ups","idempotency_key":"api-ship"}`, http.StatusOK)
	post("/orders/"+envelope.Data.OrderID+"/deliver", `{"delivered_at":"2026-06-17T12:00:00Z","idempotency_key":"api-deliver"}`, http.StatusOK)
	post("/orders/"+envelope.Data.OrderID+"/cancel", `{"reason":"late","idempotency_key":"api-cancel"}`, http.StatusConflict)
	post("/orders/missing/cancel", `{"reason":"missing","idempotency_key":"missing-cancel"}`, http.StatusNotFound)
}
