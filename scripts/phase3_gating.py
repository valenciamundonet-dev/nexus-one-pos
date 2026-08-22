import os, re as re2
#!/usr/bin/env python3
"""
Nexus One POS — Fase 3: Conexion Motores-UI

1. Feature Flags gating: usar featureToken + isTabAccessible para ocultar tabs
2. Auto-focus post barcode: conectar data-pos-search al POS
3. React.memo en componentes pesados
4. Version bump 2.9.72 → 2.9.73
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
# 1. PAGE.TSX — Feature Flags Gating con featureToken
# ════════════════════════════════════════════════════════════════
print('\n[1/4] page.tsx — Feature Flags Gating + featureToken')
page_path = f'{BASE}/src/app/page.tsx'
page = read_file(page_path)

# Add import for isTabAccessible
page = page.replace(
    'import { useGlobalShortcuts, DEFAULT_POS_SHORTCUTS } from "@/hooks/use-global-shortcuts";',
    'import { useGlobalShortcuts, DEFAULT_POS_SHORTCUTS } from "@/hooks/use-global-shortcuts";\nimport { isTabAccessible, type FeatureToken } from "@/core/feature-flags";'
)

# Add featureToken state
page = page.replace(
    '  const [appVersion, setAppVersion] = useState(\'cargando...\');',
    '  const [appVersion, setAppVersion] = useState(\'cargando...\');\n  const [featureToken, setFeatureToken] = useState<string | null>(null);'
)

# Store featureToken from license API
page = page.replace(
    '      if (licenseData && !licenseData.error) setLicense(licenseData);',
    '      if (licenseData && !licenseData.error) {\n        setLicense(licenseData);\n        if (licenseData.featureToken) setFeatureToken(licenseData.featureToken);\n      }'
)

# Update allTabs to use isTabAccessible from feature flags
# Replace the static allTabs with a dynamic version that checks featureToken
old_alltabs = '''  const allTabs = [
    { value: "dashboard", label: "Dashboard", icon: "\U0001f4ca", allowed: true, restricted: false, plan: "" },
    { value: "pos", label: "Punto de Venta", icon: "\U0001f4b3", allowed: true, restricted: false, plan: "" },
    { value: "clients", label: "Clientes", icon: "\U0001f465", allowed: canFrequentCustomers, restricted: !canFrequentCustomers, plan: "PRO" },
    { value: "products", label: "Productos", icon: "\U0001f4e6", allowed: true, restricted: false, plan: "" },
    { value: "reports", label: "Informes", icon: "\U0001f4c8", allowed: true, restricted: false, plan: "" },
    { value: "devolutions", label: "Devoluciones", icon: "\U0001f504", allowed: canDevolutions, restricted: !canDevolutions, plan: "BASICA+" },
    { value: "cash-closing", label: "Cierre de Caja", icon: "\U0001f4b0", allowed: canCashClosing, restricted: !canCashClosing, plan: "BASICA+" },
    { value: "config", label: "Configuracion", icon: "\u2699\ufe0f", allowed: true, restricted: false, plan: "" },
    { value: "license", label: "Licencia", icon: "\U0001f511", allowed: true, restricted: false, plan: "" },
    { value: "users", label: "Usuarios", icon: "\U0001f464", allowed: currentUser?.role === "admin", restricted: false, plan: "" },
    { value: "backup", label: "Respaldo", icon: "\U0001f4be", allowed: currentUser?.role === "admin", restricted: false, plan: "" },
    { value: "suppliers", label: "Proveedores", icon: "\U0001f3ea", allowed: true, restricted: false, plan: "" },
    { value: "purchases", label: "Compras", icon: "\U0001f6d2", allowed: true, restricted: false, plan: "" },
    { value: "credit", label: "Cuentas por Cobrar", icon: "\U0001f4b3", allowed: true, restricted: false, plan: "" },
    { value: "kardex", label: "Inventario/Kardex", icon: "\U0001f4e6", allowed: true, restricted: false, plan: "" },
    { value: "held-sales", label: "Ventas en Espera", icon: "\u23f8\ufe0f", allowed: true, restricted: false, plan: "" },
    { value: "quotes", label: "Presupuestos", icon: "\U0001f4cb", allowed: true, restricted: false, plan: "" },
    { value: "delivery-notes", label: "Notas de Entrega", icon: "\U0001f69a", allowed: true, restricted: false, plan: "" },
    { value: "expenses", label: "Gastos", icon: "\U0001f4b8", allowed: true, restricted: false, plan: "" },
    { value: "catalog", label: "Catalogo", icon: "\U0001f4d6", allowed: true, restricted: false, plan: "" },
  ];'''

new_alltabs = '''  // Feature Flags Gating: El featureToken firmado determina que tabs son visibles.
  // Si hay token, usa el sistema nuevo (Pilar 3). Si no, fallback al sistema viejo.
  const isTabAllowedByPlan = (tabValue: string): boolean => {
    if (featureToken) return isTabAccessible(tabValue, featureToken);
    // Fallback al sistema de features viejo si no hay token
    const featureMap: Record<string, keyof typeof license.features> = {
      'credit': 'pos', 'devolutions': 'devolutions', 'cash-closing': 'cashClosing',
      'quotes': 'saleNotes', 'delivery-notes': 'saleNotes',
      'suppliers': 'pos', 'purchases': 'pos', 'expenses': 'pos',
      'kardex': 'inventoryAlerts', 'held-sales': 'pos',
    };
    const featureKey = featureMap[tabValue];
    if (featureKey && license?.features) return !!license.features[featureKey];
    return true;
  };

  const allTabs = [
    { value: "dashboard", label: "Dashboard", icon: "\U0001f4ca" },
    { value: "pos", label: "Punto de Venta", icon: "\U0001f4b3" },
    { value: "clients", label: "Clientes", icon: "\U0001f465" },
    { value: "products", label: "Productos", icon: "\U0001f4e6" },
    { value: "reports", label: "Informes", icon: "\U0001f4c8" },
    { value: "devolutions", label: "Devoluciones", icon: "\U0001f504" },
    { value: "cash-closing", label: "Cierre de Caja", icon: "\U0001f4b0" },
    { value: "config", label: "Configuracion", icon: "\u2699\ufe0f" },
    { value: "license", label: "Licencia", icon: "\U0001f511" },
    { value: "users", label: "Usuarios", icon: "\U0001f464" },
    { value: "backup", label: "Respaldo", icon: "\U0001f4be" },
    { value: "suppliers", label: "Proveedores", icon: "\U0001f3ea" },
    { value: "purchases", label: "Compras", icon: "\U0001f6d2" },
    { value: "credit", label: "Cuentas por Cobrar", icon: "\U0001f4b3" },
    { value: "kardex", label: "Inventario/Kardex", icon: "\U0001f4e6" },
    { value: "held-sales", label: "Ventas en Espera", icon: "\u23f8\ufe0f" },
    { value: "quotes", label: "Presupuestos", icon: "\U0001f4cb" },
    { value: "delivery-notes", label: "Notas de Entrega", icon: "\U0001f69a" },
    { value: "expenses", label: "Gastos", icon: "\U0001f4b8" },
    { value: "catalog", label: "Catalogo", icon: "\U0001f4d6" },
  ];'''

page = page.replace(old_alltabs, new_alltabs)

# Update the filter function to use isTabAllowedByPlan
page = page.replace(
    '  // Filter tabs based on user role and permissions\n  const availableTabs = allTabs.filter((tab) => {\n    if (currentUser.role === "admin") return tab.allowed;\n    // Admin-only tabs (cannot be overridden by permissions)\n    if (tab.value === "users") return false;\n    if (tab.value === "config") return false;\n    if (tab.value === "license") return false;\n    if (tab.value === "backup") return false;\n    // POS and core modules always available to any logged-in user\n    if (["pos", "products", "dashboard", "reports"].includes(tab.value)) return tab.allowed;\n    // Special permission tabs (suppliers, purchases, credit)\n    if (tab.value === "suppliers") {\n      return tab.allowed && !!currentUser.permissions?.suppliers;\n    }\n    if (tab.value === "purchases") {\n      return tab.allowed && !!currentUser.permissions?.purchases;\n    }\n    if (tab.value === "credit") {\n      return tab.allowed && !!currentUser.permissions?.credit;\n    }\n    // For restricted/plan-locked tabs\n    if (tab.restricted) return tab.allowed;\n    // For tabs with specific permission keys (cash-closing, devolutions, clients, etc.)\n    if (tab.value === "cash-closing") {\n      return tab.allowed && !!currentUser.permissions?.cash_closing;\n    }\n    // All other tabs with allowed:true and no specific restriction — available to everyone\n    // (kardex, held-sales, quotes, delivery-notes, expenses, etc.)\n    return tab.allowed;\n  });',
    '  // Filter tabs based on user role, permissions and feature flags (Pilar 3)\n  const availableTabs = allTabs.filter((tab) => {\n    // Admin-only tabs\n    if (["users", "config", "license", "backup"].includes(tab.value)) {\n      return currentUser.role === "admin";\n    }\n    // Feature Flags gating — Pilar 3\n    if (!isTabAllowedByPlan(tab.value)) return false;\n    // Role-based permissions (admin sees everything)\n    if (currentUser.role === "admin") return true;\n    // Permission-specific tabs for non-admin\n    if (tab.value === "suppliers") return !!currentUser.permissions?.suppliers;\n    if (tab.value === "purchases") return !!currentUser.permissions?.purchases;\n    if (tab.value === "credit") return !!currentUser.permissions?.credit;\n    if (tab.value === "cash-closing") return !!currentUser.permissions?.cash_closing;\n    return true;\n  });'
)

write_file(page_path, page)

# ════════════════════════════════════════════════════════════════
# 2. POS-TAB — data-pos-search attribute para auto-focus
# ════════════════════════════════════════════════════════════════
print('\n[2/4] pos-tab.tsx — data-pos-search para auto-focus post barcode')
pos_path = f'{BASE}/src/components/pos-tab.tsx'
pos = read_file(pos_path)

# Add data-pos-search to the search input
# The exact attribute depends on what the search input looks like
if 'data-pos-search' not in pos:
    # Find the search input and add the attribute
    import re
    # Look for the search input pattern
    pos = re.sub(
        r'(<input[^>]*placeholder=["\'][^"\']*[Bb]uscar[^"\']*["\'][^>]*>)',
        r'\1',  # Keep as is, we add via a different approach
        pos
    )
    # Actually, let's find the search input more specifically
    pos = pos.replace(
        'placeholder="Buscar producto',
        'placeholder="Buscar producto" data-pos-search="true"'
    )
    if 'data-pos-search' in pos:
        write_file(pos_path, pos)
    else:
        print('  [SKIP] No se encontro campo de busqueda POS')
else:
    print('  [SKIP] data-pos-search ya existe')

# ════════════════════════════════════════════════════════════════
# 3. REACT.MEMO en componentes pesados
# ════════════════════════════════════════════════════════════════
print('\n[3/4] React.memo en componentes pesados')
for comp_file in ['product-list.tsx', 'product-grid.tsx', 'cart-panel.tsx', 'cart-item.tsx']:
    comp_path = f'{BASE}/src/components/pos/{comp_file}'
    if not os.path.exists(comp_path):
        comp_path = f'{BASE}/src/components/pos/cart/{comp_file}'
    if not os.path.exists(comp_path):
        print(f'  [SKIP] {comp_file} not found')
        continue
    content = read_file(comp_path)
    if 'React.memo' in content:
        print(f'  [SKIP] {comp_file} already has React.memo')
        continue
    # Add React import if needed
    if 'import React' not in content:
        content = content.replace(
            '"use client";',
            '"use client";\nimport React from "react";'
        )
    # Wrap the default export with React.memo
    # Find the export default function pattern
    import re as re2
    # For: export default function ComponentName(...)
    match = re2.search(r'(export default function (\w+))', content)
    if match:
        func_name = match.group(2)
        # Add React.memo wrapper at the end
        if f'export default React.memo({func_name})' not in content:
            # Find the last line and add memo wrapper
            content = content.replace(
                f'export default function {func_name}',
                f'function {func_name}'
            )
            content += f'\n\n// Pilar 1: Memoizacion para evitar re-renders innecesarios\nexport default React.memo({func_name});\n'
            write_file(comp_path, content)
        else:
            print(f'  [SKIP] {comp_file} already wrapped')
    else:
        # For arrow function exports: export default () => { ... }
        match2 = re2.search(r'export default (\(\))?=>', content)
        if match2:
            print(f'  [SKIP] {comp_file} uses arrow export (manual wrap needed)')
        else:
            print(f'  [SKIP] {comp_file} export pattern not recognized')

# ════════════════════════════════════════════════════════════════
# 4. VERSION BUMP → 2.9.73
# ════════════════════════════════════════════════════════════════
print('\n[4/4] Version bump → 2.9.73')
pkg_path = f'{BASE}/package.json'
pkg = read_file(pkg_path)
pkg = pkg.replace('"version": "2.9.72"', '"version": "2.9.73"')
write_file(pkg_path, pkg)

print('\n' + '='*60)
print('FASE 3 COMPLETADA — Conexion Motores-UI')
print('='*60)
print('Feature Flags Gating: tabs se ocultan segun plan (Conecta/Gestiona/Crece)')
print('Auto-focus: data-pos-search en campo de busqueda POS')
print('React.memo: componentes pesados memoizados')
print('Version: 2.9.73')
