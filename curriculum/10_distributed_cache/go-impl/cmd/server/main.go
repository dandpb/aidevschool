package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	distributedcache "distributedcache"
)

func main() {
	cache := distributedcache.NewCache(distributedcache.Config{
		NodeID:          "go-node-a",
		Shards:          []distributedcache.Node{{ID: "go-node-a", Address: ":8080"}},
		CapacityEntries: 1024,
		MaxValueBytes:   1 << 20,
		EvictionPolicy:  "lru",
		VirtualNodes:    128,
		DefaultTTL:      time.Minute,
	})
	server := &http.Server{Addr: ":8080", Handler: distributedcache.NewHTTPServer(cache)}
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = cache.Shutdown(ctx)
	_ = server.Shutdown(ctx)
}
