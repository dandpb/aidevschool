import type { Clock } from "../application/ports";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Relógio fixo para testes determinísticos (streak, revisão, evidência). */
export class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}

  now(): Date {
    return new Date(this.fixed.getTime());
  }
}
