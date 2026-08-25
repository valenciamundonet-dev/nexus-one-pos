/**
 * Utilidades para renderizado seguro
 * Evita "Objects are not valid as a React child"
 */

/**
 * Convierte cualquier valor a string seguro para renderizar en JSX.
 * Si es un objeto/array, lo convierte a JSON string (para debug).
 * Si es null/undefined, retorna string vacio.
 */
export function safeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Object or array - return empty string to prevent React error
  // Log warning for debugging
  if (typeof value === 'object') {
    console.warn('[safeText] Attempted to render object as text:', value);
    return '';
  }
  return String(value);
}

/**
 * Sanitiza un objeto de settings de la API para garantizar que todos los campos
 * sean primitivos (string, number, boolean). Convierte objetos anidados a strings.
 */
export function sanitizeSettings(raw: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) {
      sanitized[key] = key.includes('Rate') || key.includes('Pct') || key.includes('Size') ||
        key.includes('Margin') || key.includes('Days') ? 0 :
        key.includes('Active') || key.includes('Enable') || key.includes('Show') ||
        key.includes('Bold') || key.includes('Use') ? false : '';
      continue;
    }
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      sanitized[key] = value;
    } else if (t === 'object') {
      // DateTime or other objects - convert to string
      try {
        sanitized[key] = String(value);
      } catch {
        sanitized[key] = '';
      }
    } else {
      sanitized[key] = String(value);
    }
  }
  return sanitized;
}

/**
 * Convierte un valor a numero seguro, con fallback.
 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return isNaN(n) ? fallback : n;
  }
  return fallback;
}

/**
 * Convierte un valor a string seguro, con fallback.
 */
export function safeString(value: unknown, fallback: string = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}
