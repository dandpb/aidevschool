package gateway

import (
	"sync"
)

type Bulkhead struct {
	mu         sync.Mutex
	max        int
	inFlight   int
	rejections int64
}

func NewBulkhead(max int) *Bulkhead {
	return &Bulkhead{max: max}
}

func (b *Bulkhead) Acquire() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.inFlight >= b.max {
		b.rejections++
		return false
	}
	b.inFlight++
	return true
}

func (b *Bulkhead) Release() {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.inFlight > 0 {
		b.inFlight--
	}
}

func (b *Bulkhead) Snapshot() BulkheadSnapshot {
	b.mu.Lock()
	defer b.mu.Unlock()
	return BulkheadSnapshot{
		MaxConcurrency: b.max,
		InFlight:       b.inFlight,
		Rejections:     b.rejections,
	}
}

type BulkheadSnapshot struct {
	MaxConcurrency int
	InFlight       int
	Rejections     int64
}