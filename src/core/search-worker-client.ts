/**
 * Nexus One POS — Search Worker Client v1.0
 * 
 * Cliente TypeScript para comunicarse con el Web Worker de búsqueda.
 * Mantiene el hilo principal 100% libre para interacciones UI.
 * 
 * Uso:
 *   const worker = createSearchWorker();
 *   await worker.populate(products);
 *   const results = await worker.search('harina');
 *   const product = await worker.findByBarcode('123456');
 */

export interface SearchResult {
  id: string;
  name: string;
  barcode: string;
  price: number;
  wholesalePrice: number;
  cost: number;
  stock: number;
  noStock: boolean;
  category: string | null;
  taxType: string;
  vendePorPeso: boolean;
  unidadPeso: string;
}

interface WorkerMessage {
  type: string;
  payload?: any;
  query?: string;
  results?: SearchResult[];
  product?: SearchResult;
  code?: string;
  size?: number;
}

export interface SearchWorkerAPI {
  populate: (products: any[]) => Promise<void>;
  search: (query: string, limit?: number) => Promise<SearchResult[]>;
  findByBarcode: (code: string) => Promise<SearchResult | null>;
  updateStock: (productId: string, newStock: number) => void;
  terminate: () => void;
  isReady: () => boolean;
  getSize: () => number;
}

export function createSearchWorker(): SearchWorkerAPI {
  let worker: Worker | null = null;
  let ready = false;
  let indexedSize = 0;
  const pendingResolvers = new Map<string, { resolve: Function; reject: Function }>();
  let msgId = 0;

  function init() {
    try {
      worker = new Worker('/workers/search-worker.js');
      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const data = e.data;
        // Handle request-response pattern
        if (data.type === 'search-result' || data.type === 'barcode-found' || data.type === 'barcode-not-found' || data.type === 'populated') {
          // These come from initiated requests — match by type
          // Simple approach: resolve the first pending of matching type
          for (const [id, { resolve }] of pendingResolvers) {
            resolve(data);
            pendingResolvers.delete(id);
            break;
          }
        }
      };
      worker.onerror = () => {
        console.warn('[Nexus One] Search Worker failed to load. Falling back to main thread.');
        worker = null;
      };
    } catch {
      console.warn('[Nexus One] Web Workers not available. Using main thread fallback.');
      worker = null;
    }
  }

  function send(type: string, payload?: any): Promise<WorkerMessage> {
    return new Promise((resolve, reject) => {
      if (!worker) {
        reject(new Error('Worker not available'));
        return;
      }
      const id = String(++msgId);
      const timeout = setTimeout(() => {
        pendingResolvers.delete(id);
        reject(new Error('Worker timeout'));
      }, 3000);
      pendingResolvers.set(id, {
        resolve: (data: WorkerMessage) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject,
      });
      worker.postMessage({ type, payload });
    });
  }

  init();

  return {
    async populate(products) {
      if (!worker) return;
      const resp = await send('populate', { products });
      indexedSize = resp.size || 0;
      ready = true;
    },

    async search(query, limit = 30) {
      if (!worker) return [];
      try {
        const resp = await send('search', { query, limit });
        return (resp as any).results || [];
      } catch {
        return [];
      }
    },

    async findByBarcode(code) {
      if (!worker) return null;
      try {
        const resp = await send('barcode', { code });
        if (resp.type === 'barcode-found') return (resp as any).product;
        return null;
      } catch {
        return null;
      }
    },

    updateStock(productId, newStock) {
      if (!worker) return;
      worker.postMessage({ type: 'update-stock', payload: { productId, newStock } });
    },

    terminate() {
      if (worker) {
        worker.terminate();
        worker = null;
      }
      ready = false;
    },

    isReady: () => ready,
    getSize: () => indexedSize,
  };
}
