/**
 * Nexus One POS — Aislador de Periféricos v1.0
 * 
 * Si un hardware falla o se desconecta (impresora, escáner, etc.),
 * el sistema NO congela la UI. El error se aísla en segundo plano
 * y el cajero puede seguir operando.
 * 
 * Patrón: Circuit Breaker + Error Containment
 */

// ─── Tipos ──────────────────────────────────────────────────────
export type PeripheralType = 'printer' | 'scanner' | 'display' | 'cash-drawer' | 'scale';

export type PeripheralStatus = 'connected' | 'disconnected' | 'error' | 'retrying' | 'degraded';

export interface PeripheralState {
  type: PeripheralType;
  name: string;
  status: PeripheralStatus;
  lastChecked: number;
  lastError?: string;
  retryCount: number;
  maxRetries: number;
  retryDelayMs: number;
  cooldownUntil: number;
}

export interface IsolatedResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  peripheralType: PeripheralType;
  fallbackUsed: boolean;
}

// ─── Configuración del Circuit Breaker ──────────────────────────
const CIRCUIT_CONFIG: Record<PeripheralType, {
  maxRetries: number;
  retryDelayMs: number;
  cooldownMs: number;
  timeoutMs: number;
}> = {
  printer: { maxRetries: 2, retryDelayMs: 1000, cooldownMs: 30000, timeoutMs: 5000 },
  scanner: { maxRetries: 0, retryDelayMs: 0, cooldownMs: 10000, timeoutMs: 3000 },
  display: { maxRetries: 1, retryDelayMs: 500, cooldownMs: 15000, timeoutMs: 2000 },
  'cash-drawer': { maxRetries: 3, retryDelayMs: 2000, cooldownMs: 30000, timeoutMs: 3000 },
  scale: { maxRetries: 1, retryDelayMs: 500, cooldownMs: 10000, timeoutMs: 2000 },
};

// ─── Estado Global de Periféricos ───────────────────────────────
const _peripherals: Map<string, PeripheralState> = new Map();
const _listeners: Array<(states: Map<string, PeripheralState>) => void> = [];

function getPeripheralKey(type: PeripheralType, name: string): string {
  return `${type}:${name}`;
}

// ─── Registrar un periférico ─────────────────────────────────────
export function registerPeripheral(type: PeripheralType, name: string): void {
  const config = CIRCUIT_CONFIG[type];
  const key = getPeripheralKey(type, name);
  
  _peripherals.set(key, {
    type,
    name,
    status: 'connected',
    lastChecked: Date.now(),
    retryCount: 0,
    maxRetries: config.maxRetries,
    retryDelayMs: config.retryDelayMs,
    cooldownUntil: 0,
  });
}

// ─── Obtener estado de un periférico ─────────────────────────────
export function getPeripheralStatus(type: PeripheralType, name: string): PeripheralState {
  const key = getPeripheralKey(type, name);
  return _peripherals.get(key) || {
    type,
    name,
    status: 'disconnected',
    lastChecked: 0,
    retryCount: 0,
    maxRetries: 0,
    retryDelayMs: 0,
    cooldownUntil: 0,
  };
}

// ─── Ejecutar operación aislada ──────────────────────────────────
/**
 * Ejecuta una operación de periférico con aislamiento total:
 * - Timeout: si el hardware no responde en N ms, aborta
 * - Retry: reintentos configurables según tipo
 * - Cooldown: tras fallos repetidos, espera antes de reintentar
 * - Fallback: si todo falla, ejecuta la función fallback
 * 
 * LA UI NUNCA SE BLOQUEA porque todo se ejecuta en un try/catch
 * con timeout y nunca lanza errores hacia arriba.
 */
export async function isolatePeripheral<T>(
  type: PeripheralType,
  name: string,
  operation: () => Promise<T>,
  fallback?: () => T | Promise<T>
): Promise<IsolatedResult<T>> {
  const key = getPeripheralKey(type, name);
  const state = _peripherals.get(key);
  const config = CIRCUIT_CONFIG[type];
  
  // Verificar cooldown
  if (state && Date.now() < state.cooldownUntil) {
    // En cooldown, ir directo al fallback
    if (fallback) {
      try {
        const fallbackResult = await fallback();
        return { success: true, data: fallbackResult, peripheralType: type, fallbackUsed: true };
      } catch (fbErr: any) {
        return { success: false, error: fbErr?.message || 'Fallback falló', peripheralType: type, fallbackUsed: true };
      }
    }
    return { success: false, error: `Periférico en cooldown hasta ${new Date(state.cooldownUntil).toLocaleTimeString()}`, peripheralType: type, fallbackUsed: false };
  }
  
  // Intentar operación con timeout
  try {
    const result = await withTimeout(operation(), config.timeoutMs);
    
    // Éxito — resetear estado
    if (state) {
      state.status = 'connected';
      state.lastChecked = Date.now();
      state.retryCount = 0;
      state.lastError = undefined;
      state.cooldownUntil = 0;
    }
    notifyListeners();
    
    return { success: true, data: result, peripheralType: type, fallbackUsed: false };
  } catch (err: any) {
    const errorMsg = err?.message || 'Error desconocido';
    
    // Actualizar estado del periférico
    if (state) {
      state.status = 'error';
      state.lastChecked = Date.now();
      state.lastError = errorMsg;
      state.retryCount++;
      
      // Si excedió reintentos, entrar en cooldown
      if (state.retryCount >= state.maxRetries) {
        state.status = 'disconnected';
        state.cooldownUntil = Date.now() + config.cooldownMs;
      }
    }
    notifyListeners();
    
    // Intentar fallback
    if (fallback) {
      try {
        const fallbackResult = await fallback();
        return { success: true, data: fallbackResult, peripheralType: type, fallbackUsed: true, error: errorMsg };
      } catch (fbErr: any) {
        return { success: false, error: `${errorMsg} | Fallback: ${fbErr?.message}`, peripheralType: type, fallbackUsed: true };
      }
    }
    
    return { success: false, error: errorMsg, peripheralType: type, fallbackUsed: false };
  }
}

// ─── Timeout wrapper ─────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout después de ${ms}ms`)), ms);
    promise.then(
      (result) => { clearTimeout(timer); resolve(result); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

// ─── Escuchar cambios de estado ─────────────────────────────────
export function onPeripheralChange(fn: (states: Map<string, PeripheralState>) => void): () => void {
  _listeners.push(fn);
  return () => { const i = _listeners.indexOf(fn); if (i >= 0) _listeners.splice(i, 1); };
}

function notifyListeners(): void {
 const snapshot = new Map(_peripherals);
  _listeners.forEach(fn => { try { fn(snapshot); } catch {} });
}

// ─── Verificar estado de todos los periféricos ───────────────────
export function getAllPeripheralStates(): PeripheralState[] {
  return Array.from(_peripherals.values());
}

export function isAnyPeripheralDown(): boolean {
  for (const state of _peripherals.values()) {
    if (state.status === 'disconnected' || state.status === 'error') return true;
  }
  return false;
}
