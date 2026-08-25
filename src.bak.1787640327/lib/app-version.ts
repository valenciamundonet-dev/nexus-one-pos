// ─── VERSION DINAMICA ─────────────────────────────────────────
// Lee la version directamente de package.json SIN hardcodear
// Esto garantiza que siempre muestre la version correcta
// sin importar cuantas veces se actualice el sistema
// ─────────────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { join } from 'path';

let _cachedVersion: string | null = null;

export function getAppVersion(): string {
  if (_cachedVersion) return _cachedVersion;
  try {
    // En runtime, process.cwd() apunta a la raiz del proyecto
    const pkgPath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    _cachedVersion = pkg.version || '0.0.0';
    return _cachedVersion;
  } catch {
    return '0.0.0';
  }
}

// Reiniciar cache (para tests o actualizaciones en caliente)
export function resetVersionCache(): void {
  _cachedVersion = null;
}
