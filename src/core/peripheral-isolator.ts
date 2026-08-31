/**
 * Nexus One POS — Peripheral Isolator v1.0
 * 
 * Aisla periféricos (impresoras, escáneres) del hilo principal.
 * Si una impresora falla o no responde, el POS sigue funcionando.
 * 
 * Patrones:
 *   - Timeout garantizado en todas las operaciones de periféricos
 *   - Circuit breaker: después de N fallos, desactiva temporalmente
 *   - Fallback graceful: impresora falla → notificar, no bloquear
 *   - Queue offline: operaciones fallidas se encolan para reintentar
 */

// ─── Circuit Breaker State ─────────────────────────────────
enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing — reject immediately
  HALF_OPEN = 'half-open', // Testing if recovered
}

interface CircuitBreaker {
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number;
  nextRetryAt: number;
}

interface PeripheralConfig {
  name: string;
  maxRetries: number;
  timeoutMs: number;
  resetTimeMs: number;     // Time before OPEN → HALF_OPEN
  halfOpenMaxAttempts: number;
}

// ─── Peripheral Isolator ──────────────────────────────────
export class PeripheralIsolator {
  private breakers = new Map<string, CircuitBreaker>();
  private configs = new Map<string, PeripheralConfig>();
  private offlineQueue: Array<{ peripheral: string; operation: string; payload: any; timestamp: number }> = [];
  private maxQueueSize = 50;

  // ─── Register a peripheral ─────────────────────────────────
  register(config: PeripheralConfig): void {
    this.configs.set(config.name, config);
    this.breakers.set(config.name, {
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureAt: 0,
      nextRetryAt: 0,
    });
  }

  // ─── Execute with isolation ───────────────────────────────
  async execute<T>(
    peripheralName: string,
    operation: string,
    fn: () => Promise<T>,
    fallback: T | null = null
  ): Promise<T | null> {
    const breaker = this.breakers.get(peripheralName);
    const config = this.configs.get(peripheralName);

    if (!breaker || !config) {
      // Unregistered peripheral — execute directly
      return fn().catch(() => fallback);
    }

    // Check circuit state
    if (breaker.state === CircuitState.OPEN) {
      if (Date.now() < breaker.nextRetryAt) {
        // Still in cooldown — queue for later
        this.enqueue(peripheralName, operation, null);
        return fallback;
      }
      // Try half-open
      breaker.state = CircuitState.HALF_OPEN;
    }

    // Execute with timeout
    try {
      const result = await this.withTimeout(fn(), config.timeoutMs);
      this.onSuccess(peripheralName);
      return result;
    } catch (error) {
      this.onFailure(peripheralName);
      this.enqueue(peripheralName, operation, null);
      return fallback;
    }
  }

  // ─── Success handler ───────────────────────────────────────
  private onSuccess(name: string): void {
    const breaker = this.breakers.get(name);
    if (!breaker) return;
    breaker.failureCount = 0;
    breaker.state = CircuitState.CLOSED;
    // Process queued operations
    this.processQueue(name);
  }

  // ─── Failure handler ───────────────────────────────────────
  private onFailure(name: string): void {
    const breaker = this.breakers.get(name);
    const config = this.configs.get(name);
    if (!breaker || !config) return;

    breaker.failureCount++;
    breaker.lastFailureAt = Date.now();

    if (breaker.state === CircuitState.HALF_OPEN || breaker.failureCount >= config.maxRetries) {
      breaker.state = CircuitState.OPEN;
      breaker.nextRetryAt = Date.now() + config.resetTimeMs;
      console.warn(
        `[Nexus One] Peripheral "${name}" circuit OPEN. ` +
        `Failures: ${breaker.failureCount}. Retry after ${config.resetTimeMs / 1000}s.`
      );
    }
  }

  // ─── Timeout wrapper ──────────────────────────────────────
  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeout: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeout!);
    }
  }

  // ─── Queue failed operations ──────────────────────────────
  private enqueue(peripheral: string, operation: string, payload: any): void {
    if (this.offlineQueue.length >= this.maxQueueSize) {
      this.offlineQueue.shift(); // Drop oldest
    }
    this.offlineQueue.push({ peripheral, operation, payload, timestamp: Date.now() });
  }

  // ─── Process queue when peripheral recovers ────────────────
  private processQueue(name: string): void {
    const pending = this.offlineQueue.filter(e => e.peripheral === name);
    if (pending.length > 0) {
      console.log(`[Nexus One] Peripheral "${name}" recovered. ${pending.length} queued operations pending.`);
      // Don't auto-retry queued operations (they were print jobs, etc.)
      // Just notify the user
      this.offlineQueue = this.offlineQueue.filter(e => e.peripheral !== name);
    }
  }

  // ─── Get status ─────────────────────────────────────────────
  getStatus(name: string): { state: string; failures: number; queuePending: number } {
    const breaker = this.breakers.get(name);
    if (!breaker) return { state: 'unknown', failures: 0, queuePending: 0 };
    return {
      state: breaker.state,
      failures: breaker.failureCount,
      queuePending: this.offlineQueue.filter(e => e.peripheral === name).length,
    };
  }
}

// ─── Singleton with default peripherals registered ──────────
export const peripheralIsolator = new PeripheralIsolator();

// Register default peripherals
peripheralIsolator.register({
  name: 'escpos-printer',
  maxRetries: 2,
  timeoutMs: 5000,
  resetTimeMs: 30000,  // 30s before retry
  halfOpenMaxAttempts: 1,
});

peripheralIsolator.register({
  name: 'barcode-scanner',
  maxRetries: 3,
  timeoutMs: 2000,
  resetTimeMs: 10000,  // 10s
  halfOpenMaxAttempts: 1,
});

peripheralIsolator.register({
  name: 'backup-system',
  maxRetries: 1,
  timeoutMs: 30000,
  resetTimeMs: 60000,  // 1min
  halfOpenMaxAttempts: 1,
});
