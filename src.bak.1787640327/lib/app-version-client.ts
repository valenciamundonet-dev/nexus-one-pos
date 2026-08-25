// ─── VERSION DINAMICA (Client-side) ─────────────────────────
// Carga la version desde /api/app-version al montarse
// Se usa en componentes "use client" donde no se puede importar fs
// ─────────────────────────────────────────────────────────────

let _version: string | null = null;
let _loaded = false;

export function useAppVersion(): string {
  if (_loaded && _version) return _version;
  return '...';
}

// Llamar una vez al iniciar la app para precargar la version
export async function preloadAppVersion(): Promise<string> {
  if (_loaded && _version) return _version;
  try {
    const res = await fetch('/api/app-version');
    const data = await res.json();
    _version = data.version || '0.0.0';
    _loaded = true;
    return _version;
  } catch {
    return '0.0.0';
  }
}

// Setter manual (por si ya se conoce la version)
export function setAppVersion(v: string): void {
  _version = v;
  _loaded = true;
}
