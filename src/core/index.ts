/**
 * NexusOne POS — Core Engine Index v1.0
 * 
 * Punto de entrada unificado para los motores core de Etapa 4.
 * Todos los módulos están diseñados para trabajo offline de élite.
 */

// ─── Estado Atómico ────────────────────────────────────────
export { useCartStore, selectCartItemCount, selectSubtotal, selectCartItems,
  createCartItemSelector, createItemQtySelector,
  selectPaymentMethod, selectDiscount, selectNotes,
  selectIsCredit, selectCreditInfo, selectCashReceived,
  selectReference, selectMixedPayments, selectIsGranMayor,
  type CartItem, type MixedEntry, type CartState, type CartActions } from './atomic-cart-store';

export { useFeaturesStore, isTabAccessible, TAB_FEATURE_MAP, PLAN_INFO,
  selectPlan, selectIsLoaded, selectIsExpired, selectDaysRemaining,
  selectLimits, selectFeatureToken,
  createFeatureSelector, createTabAccessibleSelector,
  selectCanMixedPayment, selectCanHoldSale, selectCanKardex,
  selectCanCharts, selectCanAdvancedReports,
  selectCanMultipleUsers, selectCanRoles,
  selectCanCredit, selectCanDevolutions, selectCanQuotes,
  selectCanDeliveryNotes, selectCanPurchases, selectCanExpenses,
  selectCanSuppliers, selectCanDiscount, selectCanExportImport,
  selectCanBarcodePrint, selectCanAutoBackup,
  selectCanInventoryAlerts,
  type PlanType, type FeatureSet, type PlanLimits, type FeaturesState, type FeaturesActions } from './atomic-features-store';

// ─── Hot Products Cache ───────────────────────────────────
export { HotProductsCache, hotProductsCache, type CachedProduct } from './hot-products-cache';

// ─── Search Worker ─────────────────────────────────────────
export { createSearchWorker, type SearchResult, type SearchWorkerAPI } from './search-worker-client';

// ─── Local-First Database ──────────────────────────────────
export { NexusLocalDB, nexusDb, type DbHealth } from './nexus-db-local';

// ─── Performance Engine ────────────────────────────────────
export { PerformanceEngine, performanceEngine, type PerformanceMetrics, type PerformanceConfig } from './performance-engine';

// ─── Peripheral Isolation ─────────────────────────────────
export { PeripheralIsolator, peripheralIsolator } from './peripheral-isolator';
