/**
 * Nexus One POS — Hot Products Cache v1.0
 * 
 * Caché en memoria RAM para búsqueda ultra-rápida.
 * Mantiene los productos más vendidos indexados en un Map
 * para búsqueda predictiva en < 1ms.
 * 
 * Arquitectura:
 *   - HashMap por barcode (O(1) lookup para escáner)
 *   - Trie invertido por nombre (autocompletar mientras escribe)
 *   - LRU cache para búsquedas recientes
 *   - Se repuebla desde la API al iniciar y tras cada venta
 */

// ─── Trie Node para autocompletar ────────────────────────────
interface TrieNode {
  children: Map<string, TrieNode>;
  productIds: string[];
}

// ─── Cached Product ─────────────────────────────────────────
export interface CachedProduct {
  id: string;
  name: string;
  nameLower: string;
  barcode: string;
  secondaryBarcode: string;
  price: number;
  wholesalePrice: number;
  cost: number;
  stock: number;
  noStock: boolean;
  category: string | null;
  taxType: string;
  vendePorPeso?: boolean;
  unidadPeso?: string;
  // Frequency score for hot ranking
  saleCount: number;
  lastSoldAt: number;
}

// ─── LRU Cache Entry ────────────────────────────────────────
interface LruEntry {
  query: string;
  results: CachedProduct[];
  timestamp: number;
}

export class HotProductsCache {
  private products = new Map<string, CachedProduct>();
  private barcodeIndex = new Map<string, string>(); // barcode → productId
  private secondaryBarcodeIndex = new Map<string, string>();
  private trieRoot: TrieNode = { children: new Map(), productIds: [] };
  private searchLru: LruEntry[] = [];
  private maxLruSize = 50;
  private maxSearchResults = 30;

  // ─── Populate ─────────────────────────────────────────────
  /** Cargar todos los productos en la caché */
  populate(products: any[], salesData?: Array<{ productId: string; quantity: number; createdAt: string }>): void {
    this.products.clear();
    this.barcodeIndex.clear();
    this.secondaryBarcodeIndex.clear();
    this.trieRoot = { children: new Map(), productIds: [] };
    this.searchLru = [];

    // Build frequency map from sales data
    const freqMap = new Map<string, { count: number; lastAt: number }>();
    if (salesData) {
      for (const sale of salesData) {
        const existing = freqMap.get(sale.productId);
        const soldAt = new Date(sale.createdAt).getTime();
        if (existing) {
          existing.count += sale.quantity;
          if (soldAt > existing.lastAt) existing.lastAt = soldAt;
        } else {
          freqMap.set(sale.productId, { count: sale.quantity, lastAt: soldAt });
        }
      }
    }

    for (const p of products) {
      if (!p.active && p.active !== undefined && p.active === false) continue;

      const freq = freqMap.get(p.id) || { count: 0, lastAt: 0 };
      const cached: CachedProduct = {
        id: p.id,
        name: p.name,
        nameLower: p.name.toLowerCase(),
        barcode: p.barcode || '',
        secondaryBarcode: (p as any).secondaryBarcode || '',
        price: p.price,
        wholesalePrice: p.wholesalePrice || 0,
        cost: p.cost || 0,
        stock: p.stock ?? 0,
        noStock: p.noStock || false,
        category: p.category?.name || null,
        taxType: (p as any).taxType || 'general',
        vendePorPeso: p.vendePorPeso || false,
        unidadPeso: p.unidadPeso || 'kg',
        saleCount: freq.count,
        lastSoldAt: freq.lastAt,
      };

      this.products.set(p.id, cached);

      // Barcode index (O(1) lookup)
      if (p.barcode) this.barcodeIndex.set(p.barcode, p.id);
      if ((p as any).secondaryBarcode) {
        this.secondaryBarcodeIndex.set((p as any).secondaryBarcode, p.id);
      }

      // Trie index for name autocomplete
      this.insertIntoTrie(cached.nameLower, p.id);
    }
  }

  // ─── Trie operations ──────────────────────────────────────
  private insertIntoTrie(nameLower: string, productId: string): void {
    let node = this.trieRoot;
    for (const ch of nameLower) {
      if (!node.children.has(ch)) {
        node.children.set(ch, { children: new Map(), productIds: [] });
      }
      node = node.children.get(ch)!;
      if (node.productIds.length < 100) {
        // Limit IDs per node to prevent bloat
        node.productIds.push(productId);
      }
    }
  }

  private searchTrie(prefix: string): string[] {
    let node = this.trieRoot;
    for (const ch of prefix) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch)!;
    }
    // Collect all product IDs under this prefix (BFS)
    const ids = new Set<string>();
    const queue: TrieNode[] = [node];
    while (queue.length > 0 && ids.size < this.maxSearchResults) {
      const current = queue.shift()!;
      for (const id of current.productIds) ids.add(id);
      for (const child of current.children.values()) queue.push(child);
    }
    return Array.from(ids);
  }

  // ─── Lookup by Barcode — O(1) ────────────────────────────
  findByBarcode(code: string): CachedProduct | null {
    const id = this.barcodeIndex.get(code) || this.secondaryBarcodeIndex.get(code);
    if (!id) return null;
    return this.products.get(id) || null;
  }

  // ─── Search by name prefix — Trie + LRU ──────────────────
  search(query: string): CachedProduct[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getHotProducts(this.maxSearchResults);

    // Check LRU cache
    const cached = this.searchLru.find(e => e.query === q);
    if (cached) {
      // Move to front
      this.searchLru = this.searchLru.filter(e => e !== cached);
      this.searchLru.unshift(cached);
      return cached.results;
    }

    // Search via trie
    const ids = this.searchTrie(q);
    let results = ids.map(id => this.products.get(id)).filter(Boolean) as CachedProduct[];

    // Sort: exact prefix match first, then by hot score
    results = this.rankResults(results, q);
    results = results.slice(0, this.maxSearchResults);

    // Store in LRU
    this.searchLru.unshift({ query: q, results, timestamp: Date.now() });
    if (this.searchLru.length > this.maxLruSize) {
      this.searchLru = this.searchLru.slice(0, this.maxLruSize);
    }

    return results;
  }

  // ─── Ranking ──────────────────────────────────────────────
  private rankResults(results: CachedProduct[], query: string): CachedProduct[] {
    return results.sort((a, b) => {
      // Exact match first
      const aExact = a.nameLower === query ? 1 : 0;
      const bExact = b.nameLower === query ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      // Starts with query
      const aStarts = a.nameLower.startsWith(query) ? 1 : 0;
      const bStarts = b.nameLower.startsWith(query) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;

      // Hot score (frequency + recency)
      const aScore = a.saleCount * 1000 + a.lastSoldAt;
      const bScore = b.saleCount * 1000 + b.lastSoldAt;
      return bScore - aScore;
    });
  }

  // ─── Hot Products (most sold) ────────────────────────────
  getHotProducts(limit: number = 20): CachedProduct[] {
    return Array.from(this.products.values())
      .sort((a, b) => {
        const aScore = a.saleCount * 1000 + a.lastSoldAt;
        const bScore = b.saleCount * 1000 + b.lastSoldAt;
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  // ─── Update stock after sale ─────────────────────────────
  updateStock(productId: string, newStock: number): void {
    const p = this.products.get(productId);
    if (p) {
      p.stock = newStock;
      p.noStock = newStock <= 0;
    }
  }

  // ─── Increment sale count ────────────────────────────────
  recordSale(productId: string, qty: number = 1): void {
    const p = this.products.get(productId);
    if (p) {
      p.saleCount += qty;
      p.lastSoldAt = Date.now();
    }
  }

  // ─── Stats ───────────────────────────────────────────────
  get size(): number { return this.products.size; }
  get barcodeIndexSize(): number { return this.barcodeIndex.size; }
  get lruSize(): number { return this.searchLru.length; }
}

// ─── Singleton ───────────────────────────────────────────────
export const hotProductsCache = new HotProductsCache();
