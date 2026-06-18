package main

import (
	"log/slog"
	"net/http"
	"os"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	host := NewHost("1.2.0")
	slog.Info("plugin host listening", "addr", ":8080")
	if err := http.ListenAndServe(":8080", NewHTTPHandler(host)); err != nil {
		slog.Error("server stopped", "error", err)
	}
}
