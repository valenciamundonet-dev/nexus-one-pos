import { useEffect, useCallback, useRef } from 'react';

/**
 * Nexus One POS — Atajos de Teclado Globales v1.0
 *
 * Estilo WhatsApp / iPhone 17 Pro Max:
 * - Ctrl+Shift+P → Privacy Mode
 * - F2 → Enfocar campo de búsqueda POS
 * - F4 → Procesar venta rápida
 * - F5 → Limpiar carrito
 * - F7 → Abrir cajón (si disponible)
 * - F8 → Hold/estacionar venta
 * - F9 → Activar escáner
 * - Ctrl+B → Ir a productos
 * - Ctrl+R → Ir a reportes
 * - Ctrl+D → Ir a dashboard
 * - Ctrl+Shift+S → Sincronizar (futuro)
 * - Escape → Cerrar diálogo/modal activo
 */

export interface ShortcutDefinition {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  label: string;
  category: string;
  action: () => void;
}

export function useGlobalShortcuts(
  shortcuts: ShortcutDefinition[],
  enabled: boolean = true
) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignorar si estamos en un input/textarea/select (salvo Escape y atajos explícitos)
      const tag = (e.target as HTMLElement)?.tagName;
      const isInputFocused = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      for (const sc of shortcutsRef.current) {
        const keyMatch = e.key === sc.key || e.code === sc.key;
        const ctrlMatch = sc.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = sc.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = sc.alt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          // Permitir atajos en inputs si son de función (F-keys, Escape)
          if (isInputFocused && !sc.key.startsWith('F') && sc.key !== 'Escape') {
            continue;
          }

          e.preventDefault();
          e.stopPropagation();
          sc.action();
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled]);
}

/**
 * Catálogo de atajos por defecto para el POS.
 * Se pasa a useGlobalShortcuts con las funciones correspondientes.
 */
export const DEFAULT_POS_SHORTCUTS: Array<Omit<ShortcutDefinition, 'action'>> = [
  { key: 'F2', label: 'Buscar producto', category: 'POS' },
  { key: 'F4', label: 'Procesar venta', category: 'POS' },
  { key: 'F5', label: 'Limpiar carrito', category: 'POS' },
  { key: 'F7', label: 'Abrir cajón', category: 'Hardware' },
  { key: 'F8', label: 'Estacionar venta', category: 'POS' },
  { key: 'F9', label: 'Activar escáner', category: 'Hardware' },
  { key: 'b', ctrl: true, label: 'Productos', category: 'Navegación' },
  { key: 'r', ctrl: true, label: 'Reportes', category: 'Navegación' },
  { key: 'd', ctrl: true, label: 'Dashboard', category: 'Navegación' },
  { key: 'P', ctrl: true, shift: true, label: 'Modo privacidad', category: 'Seguridad' },
  { key: 'Escape', label: 'Cerrar diálogo', category: 'General' },
];
