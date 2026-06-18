package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"websocket-chat-go/chat"
)

type wsTransport struct{ conn *websocket.Conn }

func (t wsTransport) Send(event chat.Event) bool { return t.conn.WriteJSON(event) == nil }

type chatServer struct {
	hub      *chat.Hub
	logger   *slog.Logger
	upgrader websocket.Upgrader
}

func newChatServer(config chat.Config, logger *slog.Logger) *chatServer {
	if logger == nil {
		logger = slog.Default()
	}
	return &chatServer{hub: chat.NewHub(config), logger: logger, upgrader: websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}}
}

func (s *chatServer) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, _ *http.Request) { _ = json.NewEncoder(w).Encode(s.hub.Metrics()) })
	mux.HandleFunc("/ws", s.handleWS)
	return mux
}

func (s *chatServer) handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.logger.Warn("websocket upgrade failed", "error", err)
		return
	}
	client := s.hub.Connect(wsTransport{conn: conn}, r.URL.Query().Get("name"), time.Now().UTC())
	defer func() { s.hub.Disconnect(client.ClientID, time.Now().UTC()); _ = conn.Close() }()
	for {
		var event chat.Event
		if err := conn.ReadJSON(&event); err != nil {
			return
		}
		s.hub.Handle(client.ClientID, event, time.Now().UTC())
	}
}
