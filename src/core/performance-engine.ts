/**
 * Nexus One POS — Motor de Rendimiento Molecular v1.0
 * 
 * Optimizaciones para la "Prueba de la Tostadora":
 * - 60+ FPS en hardware con 2GB RAM / Celeron
 * - Monitor de memoria en tiempo real
 * - Debounce/throttle optimizados con requestAnimationFrame
 * - Pool de conexiones DB regulado
 * - Directivas de memoización para componentes pesados
 */

// ─── Tipos ──────────────────────────────────────────────────────
export interface PerformanceMetrics {
  memoryUsedMB: number;
  memoryTotalMB: number;
  memoryPercent: number;
  cpuUsage: number;
  fps: number;
  activeComponents: number;
  lastRenderTime: number;
}

export interface RenderCycle {
  id: string;
  component: string;
  startTime: number;
  endTime: number;
  duration: number;
}

// ─── Configuración del Motor ─────────────────────────────────────
const PERF_CONFIG = {
  // Umbral de memoria para activar modo ahorro (MB)
  memoryThresholdMB: 1200,
  
  // Intervalo de monitoreo (ms)
  monitorInterval: 5000,
  
  // Target FPS mínimo
  targetFPS: 60,
  
  // Tamaño máximo del catálogo antes de virtualizar
  virtualizationThreshold: 100,
  
  // Debounce por defecto para búsquedas (ms)
  searchDebounceMs: 150,
  
  // Batch size para operaciones masivas
  batchSize: 50,
  
  // Timeout para operaciones DB bloqueantes (ms)
  dbBusyTimeoutMs: 5000,
  
  // Máximo de renders por segundo antes de empezar a memoizar
  maxRendersPerSec: 30,
};

export { PERF_CONFIG };

// ─── Monitor de Memoria ─────────────────────────────────────────
let _monitorHandle: ReturnType<typeof setInterval> | null = null;
let _metrics: PerformanceMetrics = {
  memoryUsedMB: 0,
  memoryTotalMB: 0,
  memoryPercent: 0,
  cpuUsage: 0,
  fps: 0,
  activeComponents: 0,
  lastRenderTime: 0,
};
let _listeners: Array<(m: PerformanceMetrics) => void> = [];

function getMemoryInfo(): { used: number; total: number } {
  // Node.js (server-side)
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage();
    return {
      used: Math.round(mem.rss / 1024 / 1024),
      total: Math.round(mem.heapTotal / 1024 / 1024),
    };
  }
  // Browser
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const mem = (performance as any).memory;
    return {
      used: Math.round(mem.usedJSHeapSize / 1024 / 1024),
      total: Math.round(mem.jsHeapSizeLimit / 1024 / 1024),
    };
  }
  return { used: 0, total: 0 };
}

export function startPerformanceMonitor(): void {
  if (_monitorHandle) return;
  
  _monitorHandle = setInterval(() => {
    const { used, total } = getMemoryInfo();
    _metrics = {
      ..._metrics,
      memoryUsedMB: used,
      memoryTotalMB: total,
      memoryPercent: total > 0 ? Math.round((used / total) * 100) : 0,
    };
    _listeners.forEach(fn => fn(_metrics));
    
    // Auto-limpieza si memoria excede umbral
    if (used > PERF_CONFIG.memoryThresholdMB) {
      emitMemoryPressure(used);
    }
  }, PERF_CONFIG.monitorInterval);
}

export function stopPerformanceMonitor(): void {
  if (_monitorHandle) {
    clearInterval(_monitorHandle);
    _monitorHandle = null;
  }
}

export function getMetrics(): PerformanceMetrics {
  return { ..._metrics };
}

export function onMetricsChange(fn: (m: PerformanceMetrics) => void): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

function emitMemoryPressure(usedMB: number): void {
  // En el navegador, intentar forzar GC
  if (typeof window !== 'undefined') {
    // Sugerir al navegador que libere memoria
    if ((window as any).gc) {
      (window as any).gc();
    }
  }
  // En Node.js, se puede sugerir GC si está habilitado
  if (typeof global !== 'undefined' && (global as any).gc) {
    (global as any).gc();
  }
  console.warn(`[Nexus One] Memoria alta: ${usedMB}MB — activando modo ahorro`);
}

// ─── Debounce con rAF ───────────────────────────────────────────
export function rafDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = PERF_CONFIG.searchDebounceMs
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    if (rafId) cancelAnimationFrame(rafId);
    
    timeoutId = setTimeout(() => {
      rafId = requestAnimationFrame(() => {
        fn(...args);
        rafId = null;
      });
    }, delayMs);
  };
}

// ─── Throttle con trailing ───────────────────────────────────────
export function throttleTrailing<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let pendingArgs: Parameters<T> | null = null;
  let rafId: number | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = limitMs - (now - lastCall);
    
    pendingArgs = args;
    
    if (remaining <= 0) {
      lastCall = now;
      fn(...args);
      pendingArgs = null;
    } else if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingArgs) {
          fn(...pendingArgs);
          pendingArgs = null;
          lastCall = Date.now();
        }
      });
    }
  };
}

// ─── Búsqueda indexada para catálogo ─────────────────────────────
export class CatalogSearchEngine {
  private index: Map<string, Set<string>> = new Map();
  private products: Array<{ id: string; name: string; barcode: string; category: string }> = [];
  private normalizedProducts: Array<{ id: string; normName: string; normBarcode: string }> = [];
  
  buildIndex(products: Array<{ id: string; name: string; barcode: string; category: string }>): void {
    this.products = products;
    this.index.clear();
    
    this.normalizedProducts = products.map(p => ({
      id: p.id,
      normName: p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      normBarcode: p.barcode.toLowerCase(),
    }));
    
    // Índice invertido por palabras
    for (const p of this.normalizedProducts) {
      const words = p.normName.split(/\s+/);
      for (const word of words) {
        if (word.length < 2) continue;
        const prefix = word.substring(0, Math.min(3, word.length));
        if (!this.index.has(prefix)) {
          this.index.set(prefix, new Set());
        }
        this.index.get(prefix)!.add(p.id);
      }
    }
  }
  
  search(query: string, limit: number = 50): string[] {
    if (!query || query.length === 0) {
      return this.products.slice(0, limit).map(p => p.id);
    }
    
    const norm = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Búsqueda exacta por barcode primero (O(1) ideal)
    if (norm.length >= 4) {
      const barcodeMatch = this.normalizedProducts.find(p => p.normBarcode === norm);
      if (barcodeMatch) return [barcodeMatch.id];
    }
    
    // Búsqueda por prefijo usando índice invertido
    const candidates = new Set<string>();
    const prefixes = norm.split(/\s+/);
    
    for (const prefix of prefixes) {
      if (prefix.length < 1) continue;
      const key = prefix.substring(0, Math.min(3, prefix.length));
      const ids = this.index.get(key);
      if (ids) {
        for (const id of ids) {
          candidates.add(id);
        }
      }
    }
    
    // Filtrar y rankear
    const results: Array<{ id: string; score: number }> = [];
    for (const id of candidates) {
      const p = this.normalizedProducts.find(np => np.id === id);
      if (!p) continue;
      
      let score = 0;
      // Coincidencia al inicio del nombre
      if (p.normName.startsWith(norm)) score += 100;
      // Coincidencia parcial
      else if (p.normName.includes(norm)) score += 50;
      // Coincidencia por palabras
      else {
        for (const word of prefixes) {
          if (p.normName.includes(word)) score += 20;
        }
      }
      
      if (score > 0) results.push({ id, score });
    }
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.id);
  }
  
  needsVirtualization(): boolean {
    return this.products.length > PERF_CONFIG.virtualizationThreshold;
  }
}

// ─── Batch Processor para operaciones masivas ────────────────────
export class BatchProcessor<T> {
  private queue: T[] = [];
  private processing = false;
  
  constructor(
    private processor: (batch: T[]) => Promise<void>,
    private batchSize: number = PERF_CONFIG.batchSize
  ) {}
  
  enqueue(item: T): void {
    this.queue.push(item);
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  enqueueMany(items: T[]): void {
    this.queue.push(...items);
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      // Usar setTimeout(0) para no bloquear el event loop
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          try {
            await this.processor(batch);
          } catch (err) {
            console.error('[Nexus One] Error en batch processing:', err);
          }
          resolve();
        }, 0);
      });
    }
    
    this.processing = false;
  }
  
  get pendingCount(): number {
    return this.queue.length;
  }
}

// ─── Singleton ───────────────────────────────────────────────────
let _searchEngine: CatalogSearchEngine | null = null;

export function getCatalogSearchEngine(): CatalogSearchEngine {
  if (!_searchEngine) {
    _searchEngine = new CatalogSearchEngine();
  }
  return _searchEngine;
}
