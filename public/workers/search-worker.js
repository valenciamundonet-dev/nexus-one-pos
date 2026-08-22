/**
 * Nexus One POS — Search Worker v1.0
 * 
 * Web Worker que corre en un hilo separado para no bloquear el UI.
 * Maneja:
 *   - Indexado de productos (Trie + HashMap)
 *   - Búsqueda predictiva
 *   - Lookup por código de barras
 * 
 * Con 4GB RAM y Windows 10 de 64-bit, este Worker puede mantener
 * hasta 100,000 productos indexados sin afectar el hilo principal.
 */

// ─── Trie ──────────────────────────────────────────────────
class SearchTrie {
  constructor() {
    this.root = { children: {}, ids: [] };
    this.productMap = new Map();
    this.barcodeMap = new Map();
  }

  populate(products) {
    this.root = { children: {}, ids: [] };
    this.productMap.clear();
    this.barcodeMap.clear();

    for (const p of products) {
      if (!p.active && p.active !== undefined) continue;
      this.productMap.set(p.id, p);
      if (p.barcode) this.barcodeMap.set(p.barcode, p.id);
      if (p.secondaryBarcode) this.barcodeMap.set(p.secondaryBarcode, p.id);
      this._insert(p.name.toLowerCase(), p.id);
    }
  }

  _insert(name, id) {
    let node = this.root;
    for (const ch of name) {
      if (!node.children[ch]) node.children[ch] = { children: {}, ids: [] };
      node = node.children[ch];
      if (node.ids.length < 100) node.ids.push(id);
    }
  }

  search(query, limit = 30) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    let node = this.root;
    for (const ch of q) {
      if (!node.children[ch]) return [];
      node = node.children[ch];
    }
    const ids = new Set();
    const queue = [node];
    while (queue.length > 0 && ids.size < limit) {
      const curr = queue.shift();
      for (const id of curr.ids) ids.add(id);
      for (const key in curr.children) queue.push(curr.children[key]);
    }
    return Array.from(ids).map(id => this.productMap.get(id)).filter(Boolean);
  }

  findByBarcode(code) {
    const id = this.barcodeMap.get(code);
    return id ? this.productMap.get(id) || null : null;
  }

  getSize() { return this.productMap.size; }
}

// ─── Instance ───────────────────────────────────────────────
const trie = new SearchTrie();

// ─── Message Handler ───────────────────────────────────────
self.onmessage = function(e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'populate': {
      trie.populate(payload.products);
      self.postMessage({ type: 'populated', size: trie.getSize() });
      break;
    }

    case 'search': {
      const results = trie.search(payload.query, payload.limit);
      // Transfer product data back (structured clone)
      const serialized = results.map(p => ({
        id: p.id, name: p.name, barcode: p.barcode,
        price: p.price, wholesalePrice: p.wholesalePrice,
        cost: p.cost, stock: p.stock, noStock: p.noStock,
        category: p.category?.name || null,
        taxType: p.taxType || 'general',
        vendePorPeso: p.vendePorPeso || false,
        unidadPeso: p.unidadPeso || 'kg',
      }));
      self.postMessage({ type: 'search-result', query: payload.query, results: serialized });
      break;
    }

    case 'barcode': {
      const product = trie.findByBarcode(payload.code);
      if (product) {
        self.postMessage({ type: 'barcode-found', product: {
          id: product.id, name: product.name, barcode: product.barcode,
          price: product.price, wholesalePrice: product.wholesalePrice,
          cost: product.cost, stock: product.stock, noStock: product.noStock,
          category: product.category?.name || null,
          taxType: product.taxType || 'general',
          vendePorPeso: product.vendePorPeso || false,
          unidadPeso: product.unidadPeso || 'kg',
        }});
      } else {
        self.postMessage({ type: 'barcode-not-found', code: payload.code });
      }
      break;
    }

    case 'update-stock': {
      const p = trie.productMap.get(payload.productId);
      if (p) {
        p.stock = payload.newStock;
        p.noStock = payload.newStock <= 0;
      }
      break;
    }

    case 'ping': {
      self.postMessage({ type: 'pong', size: trie.getSize() });
      break;
    }
  }
};
