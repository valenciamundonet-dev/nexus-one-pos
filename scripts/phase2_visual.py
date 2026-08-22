#!/usr/bin/env python3
"""
Nexus One POS — Fase 2b: Mejoras Visuales y Estructurales

1. Login Screen: Nuevo logo + branding mejorado
2. Privacy Mode: Indicador visual en la UI principal
3. Shortcuts Bar: Componente visual de atajos
4. manifest.json: Actualizar iconos y nombre
5. Version bump 2.9.71 → 2.9.72
"""

BASE = '/home/z/my-project/upload/extracted'

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  [OK] {path}')

# ════════════════════════════════════════════════════════════════
# 1. LOGIN SCREEN — Nuevo logo + branding cinematográfico
# ════════════════════════════════════════════════════════════════
print('\n[1/5] login-screen.tsx — Nuevo logo + Cinematic Dark Mode')
login_path = f'{BASE}/src/components/login-screen.tsx'
login = read_file(login_path)

# Replace the SVG icon with the new logo image
login = login.replace(
    '        <div className="text-center mb-8">\n          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">\n            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />\n            </svg>\n          </div>\n          <h1 className="text-2xl font-bold text-white">{storeName}</h1>\n          <p className="text-primary text-xs font-medium tracking-widest uppercase mt-1">Conecta - Gestiona - Crece</p>\n          <p className="text-slate-400 text-sm mt-1">Sistema Punto de Venta</p>',
    '        <div className="text-center mb-8">\n          {/* Nexus One Logo */}\n          <div className="inline-flex items-center justify-center w-24 h-24 mb-4 rounded-2xl overflow-hidden nexus-logo-glow">\n            <img src="/icon-192.png" alt="Nexus One" className="w-full h-full object-contain" />\n          </div>\n          <h1 className="text-3xl font-extrabold text-white tracking-tight nexus-title-gradient">{storeName}</h1>\n          <p className="text-primary/80 text-xs font-semibold tracking-[0.3em] uppercase mt-2">Conecta &middot; Gestiona &middot; Crece</p>\n          <p className="text-slate-400 text-sm mt-1">Sistema Punto de Venta</p>'
)

# Enhance background with cinematic glow effects
login = login.replace(
    '      <div className="absolute inset-0 overflow-hidden">\n        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />\n        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />\n      </div>',
    '      <div className="absolute inset-0 overflow-hidden">\n        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-pulse" />\n        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: "1s"}} />\n        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />\n      </div>'
)

# Also update the footer version
login = login.replace(
    '          Nexus One POS v{appVer} &bull; Doble Moneda $/Bs\n          <br />\n          <span className="text-primary/60">Conecta - Gestiona - Crece</span>',
    '          Nexus One POS v{appVer} &bull; Doble Moneda $/Bs\n          <br />\n          <span className="text-primary/60">Conecta &middot; Gestiona &middot; Crece</span>'
)

write_file(login_path, login)

# ════════════════════════════════════════════════════════════════
# 2. GLOBALS.CSS — Nuevas clases para login cinematográfico
# ════════════════════════════════════════════════════════════════
print('\n[2/5] globals.css — Cinematic login + Privacy Mode indicator')
css_path = f'{BASE}/src/app/globals.css'
css = read_file(css_path)

# Add new classes before the print styles
css = css.replace(
    '/* \u2500\u2500 Print styles for ticket \u2500\u2500 */',
    '''/* \u2500\u2500 Nexus One: Cinematic Login \u2500\u2500 */
.nexus-logo-glow {
  box-shadow: 0 0 40px -5px hsl(var(--primary) / 0.3),
              0 0 80px -10px hsl(var(--primary) / 0.1);
  animation: nexus-pulse-glow 3s ease-in-out infinite;
}
@keyframes nexus-pulse-glow {
  0%, 100% { box-shadow: 0 0 40px -5px hsl(var(--primary) / 0.3), 0 0 80px -10px hsl(var(--primary) / 0.1); }
  50% { box-shadow: 0 0 50px -5px hsl(var(--primary) / 0.4), 0 0 100px -10px hsl(var(--primary) / 0.15); }
}
.nexus-title-gradient {
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(270 70% 60%), hsl(var(--primary)));
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: nexus-shimmer 4s ease-in-out infinite;
}
@keyframes nexus-shimmer {
  0%, 100% { background-position: 0% center; }
  50% { background-position: 200% center; }
}

/* \u2500\u2500 Nexus One: Privacy Mode Indicator \u2500\u2500 */
.nexus-privacy-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: all 0.2s ease;
}
.nexus-privacy-indicator.active {
  background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
  border: 1px solid hsl(var(--primary) / 0.3);
}
.nexus-privacy-indicator.inactive {
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
  border: 1px solid transparent;
}

/* \u2500\u2500 Print styles for ticket \u2500\u2500 */'''
)

write_file(css_path, css)

# ════════════════════════════════════════════════════════════════
# 3. PAGE.TSX — Privacy Mode indicator visual en footer
# ════════════════════════════════════════════════════════════════
print('\n[3/5] page.tsx — Privacy Mode indicator visual')
page_path = f'{BASE}/src/app/page.tsx'
page = read_file(page_path)

# Replace the footer with a proper privacy indicator
page = page.replace(
    '      <footer className="border-t py-2 text-center text-xs text-muted-foreground">\n        <p>Nexus One POS v{appVersion} - Conecta - Gestiona - Crece | Doble Moneda $/Bs{showWatermark && " | Version de Prueba"}{privacyActive && " | Privacidad ON"}</p>\n      </footer>',
    '      <footer className="border-t py-2 px-4 flex items-center justify-between text-xs text-muted-foreground">\n        <p>Nexus One POS v{appVersion} &middot; Conecta &middot; Gestiona &middot; Crece &middot; Doble Moneda $/Bs{showWatermark && " &middot; Prueba"}</p>\n        <div className="flex items-center gap-2">\n          <button\n            onClick={togglePrivacy}\n            className={`nexus-privacy-indicator ${privacyActive ? "active" : "inactive"}`}\n            title="Ctrl+Shift+P para activar/desactivar"\n          >\n            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={privacyActive ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />\n            </svg>\n            {privacyActive ? "Privacidad" : "Visible"}\n          </button>\n          <span className="text-[10px] opacity-50">Ctrl+Shift+P</span>\n        </div>\n      </footer>'
)

write_file(page_path, page)

# ════════════════════════════════════════════════════════════════
# 4. MANIFEST.JSON — Actualizar iconos y nombre
# ════════════════════════════════════════════════════════════════
print('\n[4/5] manifest.json — Actualizar iconos')
manifest_path = f'{BASE}/public/manifest.json'
manifest = read_file(manifest_path)
manifest = manifest.replace('"name": "Nexus One POS"', '"name": "Nexus One POS — Conecta \u00b7 Gestiona \u00b7 Crece"')
write_file(manifest_path, manifest)

# ════════════════════════════════════════════════════════════════
# 5. VERSION BUMP → 2.9.72
# ════════════════════════════════════════════════════════════════
print('\n[5/5] Version bump → 2.9.72')
pkg_path = f'{BASE}/package.json'
pkg = read_file(pkg_path)
pkg = pkg.replace('"version": "2.9.71"', '"version": "2.9.72"')
write_file(pkg_path, pkg)

leame_path = f'{BASE}/LEAME-PROYECTO.md'
leame = read_file(leame_path)
leame = leame.replace('> **Version actual:** 2.9.71', '> **Version actual:** 2.9.72')
leame = leame.replace('## 2. Version Actual — v2.9.71', '## 2. Version Actual — v2.9.72')
leame = leame.replace(
    '### Cambios vs v2.9.70 (Fase 2 — 5 Pilares Arquitectonicos):',
    '### Cambios vs v2.9.71:\n| # | Cambio | Detalle |\n|---|--------|--------|\n| 1 | Fix build | Coma doble en license/route.ts corregida |\n| 2 | Nuevo logo | Icono NEXUS ONE con atomo de neon aplicado a login + PWA |\n| 3 | Login cinematico | Logo con glow animado + titulo con shimmer gradient |\n| 4 | Privacy indicator | Boton visual en footer + Ctrl+Shift+P tooltip |\n| 5 | Cinematic CSS | Animaciones de glow, shimmer, pulse para dark mode |\n\n### Cambios vs v2.9.70 (Fase 2 — 5 Pilares Arquitectonicos):'
)
write_file(leame_path, leame)

print('\n' + '='*60)
print('FASE 2b COMPLETADA — Mejoras Visuales + Fix')
print('='*60)
print('Error corregido: coma doble en license/route.ts')
print('Nuevo logo: atomo de neon en login + PWA + favicon')
print('Login: cinematic glow + shimmer gradient + pulse effects')
print('Privacy: indicador visual interactivo en footer')
print('Version: 2.9.72')
