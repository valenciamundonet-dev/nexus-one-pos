/**
 * Nexus One POS — Performance Engine v1.0
 * 
 * Monitoreo de rendimiento adaptativo para Windows 10 + 4GB RAM.
 * Objetivo: 60-120 FPS estables en la UI del POS.
 * 
 * Funciones:
 *   - FPS Monitor con detección de caídas
 *   - Memory watchdog (usa Performance API del navegador)
 *   - Adaptive quality: reduce animaciones si FPS < 30
 *   - Reporte de métricas para diagnóstico
 */

// ─── Types ──────────────────────────────────────────────────
export interface PerformanceMetrics {
  fps: number;
  avgFps: number;
  frameTimeMs: number;
  memoryUsedMB: number;
  memoryLimitMB: number;
  domNodes: number;
  adaptiveQuality: boolean;
  timestamp: number;
}

export interface PerformanceConfig {
  targetFps: number;
  minAcceptableFps: number;
  fpsWindowMs: number;
  memoryWarningThresholdMB: number;
  enableAdaptiveQuality: boolean;
}

// ─── Default config for Windows 10 + 4GB RAM ───────────────
const DEFAULT_CONFIG: PerformanceConfig = {
  targetFps: 60,
  minAcceptableFps: 30,
  fpsWindowMs: 2000,
  memoryWarningThresholdMB: 512,
  enableAdaptiveQuality: true,
};

// ─── Performance Engine ────────────────────────────────────
export class PerformanceEngine {
  private config: PerformanceConfig;
  private frameTimestamps: number[] = [];
  private rafId: number | null = null;
  private metricsCallback: ((m: PerformanceMetrics) => void) | null = null;
  private isRunning = false;
  private adaptiveQualityActive = false;
  private lastMetrics: PerformanceMetrics | null = null;

  // Persistent metrics
  private totalFrames = 0;
  private droppedFrames = 0;
  private maxFrameTime = 0;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Start monitoring ──────────────────────────────────────
  start(onMetrics?: (m: PerformanceMetrics) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.metricsCallback = onMetrics || null;
    this.loop();

    // Apply initial CSS optimizations for 4GB RAM target
    this.applyOptimizations();

    console.log(`[Nexus One Perf] Monitoring started (target: ${this.config.targetFps} FPS)`);
  }

  // ─── Stop monitoring ───────────────────────────────────────
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isRunning = false;
    console.log(`[Nexus One Perf] Monitoring stopped. Total frames: ${this.totalFrames}, dropped: ${this.droppedFrames}`);
  }

  // ─── Main loop ─────────────────────────────────────────────
  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    this.frameTimestamps.push(now);
    this.totalFrames++;

    // Calculate FPS over the window
    const windowStart = now - this.config.fpsWindowMs;
    while (this.frameTimestamps.length > 0 && this.frameTimestamps[0] < windowStart) {
      this.frameTimestamps.shift();
    }

    const fps = this.frameTimestamps.length / (this.config.fpsWindowMs / 1000);
    const frameTimeMs = 1000 / Math.max(fps, 1);

    if (frameTimeMs > this.maxFrameTime) this.maxFrameTime = frameTimeMs;

    // Detect dropped frames
    if (frameTimeMs > (1000 / this.config.minAcceptableFps)) {
      this.droppedFrames++;
    }

    // Throttle metric reporting (every 30 frames)
    if (this.totalFrames % 30 === 0) {
      this.reportMetrics(fps, frameTimeMs);
    }

    // Adaptive quality check
    if (this.config.enableAdaptiveQuality && this.totalFrames % 60 === 0) {
      this.checkAdaptiveQuality(fps);
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  // ─── Report metrics ─────────────────────────────────────────
  private reportMetrics(fps: number, frameTimeMs: number): void {
    const memInfo = this.getMemoryInfo();
    const domNodes = document.querySelectorAll('*').length;

    const metrics: PerformanceMetrics = {
      fps: Math.round(fps * 10) / 10,
      avgFps: Math.round(fps * 10) / 10,
      frameTimeMs: Math.round(frameTimeMs * 100) / 100,
      memoryUsedMB: memInfo.usedMB,
      memoryLimitMB: memInfo.limitMB,
      domNodes,
      adaptiveQuality: this.adaptiveQualityActive,
      timestamp: Date.now(),
    };

    this.lastMetrics = metrics;
    this.metricsCallback?.(metrics);
  }

  // ─── Get memory info ───────────────────────────────────────
  private getMemoryInfo(): { usedMB: number; limitMB: number } {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const perf = (performance as any).memory;
      return {
        usedMB: Math.round(perf.usedJSHeapSize / 1024 / 1024),
        limitMB: Math.round(perf.jsHeapSizeLimit / 1024 / 1024),
      };
    }
    // Fallback: estimate from 4GB target
    return { usedMB: 0, limitMB: 4096 };
  }

  // ─── Adaptive quality ──────────────────────────────────────
  private checkAdaptiveQuality(fps: number): void {
    const shouldActivate = fps < this.config.minAcceptableFps;

    if (shouldActivate && !this.adaptiveQualityActive) {
      this.adaptiveQualityActive = true;
      document.documentElement.classList.add('nexus-adaptive-quality');
      console.warn(`[Nexus One Perf] FPS dropped to ${Math.round(fps)}. Adaptive quality ON.`);
    } else if (!shouldActivate && this.adaptiveQualityActive) {
      this.adaptiveQualityActive = false;
      document.documentElement.classList.remove('nexus-adaptive-quality');
      console.log(`[Nexus One Perf] FPS recovered to ${Math.round(fps)}. Adaptive quality OFF.`);
    }
  }

  // ─── Apply CSS/performance optimizations for target HW ─────
  private applyOptimizations(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Enable hardware acceleration hints
    root.style.setProperty('--nexus-will-change', 'transform, opacity');

    // Use CSS containment for tab content (isolation)
    root.style.setProperty('--nexus-contain', 'layout style paint');

    // Enable smooth scrolling with reduced-motion respect
    root.style.setProperty('scroll-behavior', 'smooth');

    // Add GPU layer hints for POS-critical elements
    const style = document.createElement('style');
    style.id = 'nexus-perf-hints';
    style.textContent = `
      /* Nexus One Performance Hints — Windows 10 + 4GB RAM */
      .nexus-gpu-layer {
        will-change: var(--nexus-will-change);
        contain: var(--nexus-contain);
        backface-visibility: hidden;
        transform: translateZ(0);
      }
      /* Adaptive quality: reduce animations when FPS drops */
      .nexus-adaptive-quality *,
      .nexus-adaptive-quality *::before,
      .nexus-adaptive-quality *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      /* Contain tab panels to prevent layout thrash */
      [data-radix-tabs-content] > div {
        contain: strict;
        content-visibility: auto;
      }
      /* Inactive tabs: skip rendering entirely */
      [data-state="inactive"] {
        content-visibility: hidden;
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Get latest metrics (for API/debug) ─────────────────────
  getMetrics(): PerformanceMetrics | null {
    return this.lastMetrics;
  }

  // ─── Get summary ────────────────────────────────────────────
  getSummary() {
    return {
      totalFrames: this.totalFrames,
      droppedFrames: this.droppedFrames,
      dropRate: this.totalFrames > 0
        ? ((this.droppedFrames / this.totalFrames) * 100).toFixed(2) + '%'
        : '0%',
      maxFrameTime: Math.round(this.maxFrameTime * 100) / 100,
      adaptiveQualityActive: this.adaptiveQualityActive,
    };
  }
}

// ─── Singleton ───────────────────────────────────────────────
export const performanceEngine = new PerformanceEngine();

// ─── Hook for React components ──────────────────────────────
// Usage in a component:
//   const perfRef = useRef<PerformanceMetrics | null>(null);
//   useEffect(() => {
//     performanceEngine.start((m) => { perfRef.current = m; });
//     return () => performanceEngine.stop();
//   }, []);
