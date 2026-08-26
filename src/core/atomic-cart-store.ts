/**
 * NexusOne POS — Atomic Cart Store v1.0
 * 
 * Arquitectura de Estado Atómico con Zustand v5.
 * Cada selector es atómico: los componentes solo se re-renderizan
 * cuando SU porción específica del estado cambia.
 * 
 * Principio: Si cambia la nota del carrito, el panel de productos NO se re-renderiza.
 * Si cambia la cantidad del item #3, el item #1 NO se re-renderiza.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productBarcode: string;
  quantity: number;
  unitPrice: number;
  total: number;
  isWholesale: boolean;
  taxType: string;
  cost: number;
  pesoIngresado?: boolean;
  vendePorPeso?: boolean;
  unidadPeso?: string;
  secondaryBarcode?: string;
}

export interface MixedEntry {
  method: string;
  amountBs: number;
  amountUsd: number;
  reference: string;
}

export interface CartState {
  // ── Core cart data ──────────────────────────────────────────
  items: CartItem[];
  discount: number;
  notes: string;
  
  // ── Payment ────────────────────────────────────────────────
  paymentMethod: string;
  referenceNumber: string;
  cashReceived: string;
  cashReceivedUsd: string;
  mixedPayments: MixedEntry[];
  
  // ── Credit ─────────────────────────────────────────────────
  isCredit: boolean;
  creditClientId: string;
  creditClientName: string;
  creditClientDebt: number;
  creditDays: number;
  
  // ── Modes ──────────────────────────────────────────────────
  isGranMayorMode: boolean;
  
  // ── Derived (pre-computed for O(1) access) ────────────────
  itemCount: number;
  subtotal: number;
}

export interface CartActions {
  // ── Item operations (return affected item IDs for granular updates) ──
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  setWholesale: (productId: string, isWs: boolean, wsPrice: number) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;
  
  // ── Discount & Notes ───────────────────────────────────────
  setDiscount: (amount: number) => void;
  setNotes: (text: string) => void;
  
  // ── Payment ────────────────────────────────────────────────
  setPaymentMethod: (method: string) => void;
  setReferenceNumber: (ref: string) => void;
  setCashReceived: (val: string) => void;
  setCashReceivedUsd: (val: string) => void;
  updateMixedEntry: (index: number, field: keyof MixedEntry, value: string | number) => void;
  addMixedEntry: () => void;
  removeMixedEntry: (index: number) => void;
  
  // ── Credit ─────────────────────────────────────────────────
  setIsCredit: (val: boolean) => void;
  setCreditClientId: (id: string) => void;
  setCreditClientName: (name: string) => void;
  setCreditClientDebt: (debt: number) => void;
  setCreditDays: (days: number) => void;
  
  // ── Modes ──────────────────────────────────────────────────
  toggleGranMayor: () => void;
  
  // ── Bulk load (from held sales / quotes) ──────────────────
  loadFromHeldSale: (data: {
    items: CartItem[]; discount: number; notes: string;
    paymentMethod: string; clientName?: string; clientId?: string;
  }) => void;
}

// ─── Helper: recalc derived ──────────────────────────────────
function recalcDerived(items: CartItem[]): { itemCount: number; subtotal: number } {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.total;
  }
  return { itemCount: items.length, subtotal };
}

// ─── Helper: update item in array (structural sharing) ──────────
function updateItemInArray(
  items: CartItem[],
  productId: string,
  updater: (item: CartItem) => CartItem
): CartItem[] {
  let found = false;
  const result = items.map(item => {
    if (item.productId === productId) {
      found = true;
      return updater(item);
    }
    return item;
  });
  return found ? result : items;
}

// ─── DEFAULT MIXED PAYMENTS ──────────────────────────────────
const DEFAULT_MIXED: MixedEntry[] = [
  { method: 'efectivo', amountBs: 0, amountUsd: 0, reference: '' },
  { method: 'pago-movil', amountBs: 0, amountUsd: 0, reference: '' },
];

// ─── Store ────────────────────────────────────────────────────
export type CartStore = CartState & CartActions;

export const useCartStore = create<CartStore>()(
  subscribeWithSelector((set, get) => ({
    // ── Initial state ──────────────────────────────────────────
    items: [],
    discount: 0,
    notes: '',
    paymentMethod: 'efectivo',
    referenceNumber: '',
    cashReceived: '',
    cashReceivedUsd: '',
    mixedPayments: [...DEFAULT_MIXED],
    isCredit: false,
    creditClientId: '',
    creditClientName: '',
    creditClientDebt: 0,
    creditDays: 30,
    isGranMayorMode: false,
    itemCount: 0,
    subtotal: 0,

    // ── Item operations ─────────────────────────────────────────
    addItem: (item) => {
      set(state => {
        const existing = state.items.find(i => i.productId === item.productId);
        let newItems: CartItem[];
        if (existing) {
          newItems = updateItemInArray(state.items, item.productId, i => ({
            ...i,
            quantity: i.quantity + item.quantity,
            total: (i.quantity + item.quantity) * i.unitPrice,
          }));
        } else {
          newItems = [...state.items, item];
        }
        const derived = recalcDerived(newItems);
        return { items: newItems, ...derived };
      });
    },

    removeItem: (productId) => {
      set(state => {
        const newItems = state.items.filter(i => i.productId !== productId);
        const derived = recalcDerived(newItems);
        return { items: newItems, ...derived };
      });
    },

    updateQuantity: (productId, qty) => {
      if (qty <= 0) {
        get().removeItem(productId);
        return;
      }
      set(state => {
        const newItems = updateItemInArray(state.items, productId, i => ({
          ...i,
          quantity: qty,
          total: qty * i.unitPrice,
        }));
        const derived = recalcDerived(newItems);
        return { items: newItems, ...derived };
      });
    },

    setWholesale: (productId, isWs, wsPrice) => {
      set(state => {
        const newItems = updateItemInArray(state.items, productId, i => {
          const price = isWs ? wsPrice : (i as any).originalPrice || i.unitPrice;
          return { ...i, isWholesale: isWs, unitPrice: price, total: i.quantity * price };
        });
        const derived = recalcDerived(newItems);
        return { items: newItems, ...derived };
      });
    },

    clearCart: () => {
      set({
        items: [], discount: 0, notes: '',
        paymentMethod: 'efectivo', referenceNumber: '',
        cashReceived: '', cashReceivedUsd: '',
        mixedPayments: [...DEFAULT_MIXED],
        isCredit: false, creditClientId: '', creditClientName: '',
        creditClientDebt: 0, creditDays: 30,
        isGranMayorMode: false,
        itemCount: 0, subtotal: 0,
      });
    },

    setCart: (items) => {
      const derived = recalcDerived(items);
      set({ items, ...derived });
    },

    // ── Discount & Notes ───────────────────────────────────────
    setDiscount: (amount) => set({ discount: amount }),
    setNotes: (text) => set({ notes: text }),

    // ── Payment ────────────────────────────────────────────────
    setPaymentMethod: (method) => set({ paymentMethod: method }),
    setReferenceNumber: (ref) => set({ referenceNumber: ref }),
    setCashReceived: (val) => set({ cashReceived: val }),
    setCashReceivedUsd: (val) => set({ cashReceivedUsd: val }),
    updateMixedEntry: (index, field, value) => {
      set(state => ({
        mixedPayments: state.mixedPayments.map((e, i) =>
          i === index ? { ...e, [field]: value } : e
        ),
      }));
    },
    addMixedEntry: () => {
      set(state => ({
        mixedPayments: [...state.mixedPayments, { method: 'pago-movil', amountBs: 0, amountUsd: 0, reference: '' }],
      }));
    },
    removeMixedEntry: (index) => {
      set(state => ({
        mixedPayments: state.mixedPayments.length <= 2
          ? state.mixedPayments
          : state.mixedPayments.filter((_, i) => i !== index),
      }));
    },

    // ── Credit ─────────────────────────────────────────────────
    setIsCredit: (val) => set({ isCredit: val }),
    setCreditClientId: (id) => set({ creditClientId: id }),
    setCreditClientName: (name) => set({ creditClientName: name }),
    setCreditClientDebt: (debt) => set({ creditClientDebt: debt }),
    setCreditDays: (days) => set({ creditDays: days }),

    // ── Modes ──────────────────────────────────────────────────
    toggleGranMayor: () => set(state => ({ isGranMayorMode: !state.isGranMayorMode })),

    // ── Bulk load ──────────────────────────────────────────────
    loadFromHeldSale: (data) => {
      const derived = recalcDerived(data.items);
      set({
        items: data.items,
        discount: data.discount,
        notes: data.notes,
        paymentMethod: data.paymentMethod,
        creditClientId: data.clientId || '',
        creditClientName: data.clientName || '',
        ...derived,
      });
    },
  }))
);

// ═══════════════════════════════════════════════════════════════════
// ATOMIC SELECTORS — Zero unnecessary re-renders
// ═══════════════════════════════════════════════════════════════════
// Cada selector devuelve SOLO la porción de estado que el componente necesita.
// Gracias a subscribeWithSelector + equality fn, el componente solo se
// re-renderiza si su porción cambia.

/** Item count — usado por badge del tab, header, etc. */
export const selectCartItemCount = (s: CartState) => s.itemCount;

/** Subtotal total del carrito */
export const selectSubtotal = (s: CartState) => s.subtotal;

/** Todos los items del carrito (solo se re-renderiza si se añade/elimina items) */
export const selectCartItems = (s: CartState) => s.items;

/** Un item específico por productId — se re-renderiza SOLO si ese item cambia */
export const createCartItemSelector = (productId: string) => (s: CartState) =>
  s.items.find(i => i.productId === productId) || null;

/** Cantidad de un item específico */
export const createItemQtySelector = (productId: string) => (s: CartState) => {
  const item = s.items.find(i => i.productId === productId);
  return item ? item.quantity : 0;
};

/** Método de pago */
export const selectPaymentMethod = (s: CartState) => s.paymentMethod;

/** Descuento */
export const selectDiscount = (s: CartState) => s.discount;

/** Notas */
export const selectNotes = (s: CartState) => s.notes;

/** Estado de crédito */
export const selectIsCredit = (s: CartState) => s.isCredit;

/** Datos del crédito */
export const selectCreditInfo = (s: CartState) => ({
  isCredit: s.isCredit,
  clientId: s.creditClientId,
  clientName: s.creditClientName,
  debt: s.creditClientDebt,
  days: s.creditDays,
});

/** Montos de efectivo recibido */
export const selectCashReceived = (s: CartState) => ({
  bs: s.cashReceived,
  usd: s.cashReceivedUsd,
});

/** Referencia de pago */
export const selectReference = (s: CartState) => s.referenceNumber;

/** Pagos mixtos */
export const selectMixedPayments = (s: CartState) => s.mixedPayments;

/** Modo Gran Mayor */
export const selectIsGranMayor = (s: CartState) => s.isGranMayorMode;

// ─── Usage example in a component: ────────────────────────────
// 
// // BAD: Se re-renderiza con CUALQUIER cambio en el carrito
// const cart = useCartStore();
// 
// // GOOD: Solo se re-renderiza si el itemCount cambia
// const itemCount = useCartStore(selectCartItemCount);
// 
// // GOOD: Solo se re-renderiza si los items cambian
// const items = useCartStore(selectCartItems);
// 
// // EXCELLENT: Solo se re-renderiza si el item específico cambia
// const item = useCartStore(createCartItemSelector('product-123'));
// const qty = useCartStore(createItemQtySelector('product-123'));
