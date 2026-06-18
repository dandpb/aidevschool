package main

import (
	"testing"

	"api-gateway-go/gateway"
)

func TestDefaultConfig(t *testing.T) {
	cfg := gateway.DefaultConfig()
	if cfg.Port != "8080" {
		t.Errorf("expected port 8080, got %s", cfg.Port)
	}
	if len(cfg.Routes) != 1 {
		t.Fatalf("expected 1 route, got %d", len(cfg.Routes))
	}
	r := cfg.Routes[0]
	if r.ID != "orders" {
		t.Errorf("expected orders route, got %s", r.ID)
	}
	if r.PathPrefix != "/api/orders" {
		t.Errorf("expected /api/orders, got %s", r.PathPrefix)
	}
}

func TestNewGateway(t *testing.T) {
	cfg := gateway.DefaultConfig()
	gw, err := gateway.New(cfg)
	if err != nil {
		t.Fatal(err)
	}
	if gw == nil {
		t.Fatal("expected gateway")
	}
}
