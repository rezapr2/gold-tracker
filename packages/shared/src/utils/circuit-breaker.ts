/**
 * Minimal in-process circuit breaker. After `threshold` consecutive failures for
 * a key it "opens" the circuit and {@link isOpen} returns true for `cooldownMs`,
 * so callers can skip a source known to be down instead of paying its timeout on
 * every attempt. A success (or the cooldown elapsing) resets the key.
 *
 * State is per-process by design — each instance learns independently which
 * upstreams are unhealthy, so no shared coordination is needed.
 */
export class CircuitBreaker {
  private readonly failures = new Map<string, number>();
  private readonly openUntil = new Map<string, number>();

  constructor(
    private readonly threshold = 3,
    private readonly cooldownMs = 120_000,
    private readonly now: () => number = Date.now,
  ) {}

  isOpen(key: string): boolean {
    const until = this.openUntil.get(key);
    if (until === undefined) return false;
    if (until > this.now()) return true;
    // Cooldown elapsed → half-open: clear state and allow one trial attempt.
    this.openUntil.delete(key);
    this.failures.delete(key);
    return false;
  }

  recordSuccess(key: string): void {
    this.failures.delete(key);
    this.openUntil.delete(key);
  }

  recordFailure(key: string): void {
    const next = (this.failures.get(key) ?? 0) + 1;
    this.failures.set(key, next);
    if (next >= this.threshold) {
      this.openUntil.set(key, this.now() + this.cooldownMs);
    }
  }

  /** Snapshot of currently-open keys (for heartbeat/status detail). */
  openKeys(): string[] {
    const now = this.now();
    return [...this.openUntil.entries()].filter(([, until]) => until > now).map(([k]) => k);
  }
}
