export interface BulkheadSnapshot {
  maxConcurrency: number;
  inFlight: number;
  rejections: number;
}

export class Bulkhead {
  private inFlight = 0;
  private rejections = 0;

  constructor(private max: number) {}

  acquire(): boolean {
    if (this.inFlight >= this.max) {
      this.rejections++;
      return false;
    }
    this.inFlight++;
    return true;
  }

  release(): void {
    if (this.inFlight > 0) {
      this.inFlight--;
    }
  }

  snapshot(): BulkheadSnapshot {
    return {
      maxConcurrency: this.max,
      inFlight: this.inFlight,
      rejections: this.rejections,
    };
  }
}
