import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Nexus One POS — Privacy Mode Hook v1.0
 * 
 * Oculta o difumina montos de dinero con un clic o atajo (Ctrl+Shift+P).
 * Ideal para cuando hay clientes mirando la pantalla del cajero.
 */

export type PrivacyLevel = 'off' | 'blur' | 'hide';

interface PrivacyState {
  enabled: boolean;
  level: PrivacyLevel;
}

const STORAGE_KEY = 'nexusone-privacy-mode';

export function usePrivacyMode() {
  const [privacy, setPrivacy] = useState<PrivacyState>(() => {
    if (typeof window === 'undefined') return { enabled: false, level: 'off' };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { enabled: parsed.enabled || false, level: parsed.level || 'blur' };
      }
    } catch {}
    return { enabled: false, level: 'blur' };
  });

  // Persistir en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(privacy));
    } catch {}
  }, [privacy]);

  // Toggle rápido
  const toggle = useCallback(() => {
    setPrivacy(prev => ({
      ...prev,
      enabled: !prev.enabled,
      level: prev.enabled ? 'off' : 'blur',
    }));
  }, []);

  // Cambiar nivel
  const setLevel = useCallback((level: PrivacyLevel) => {
    setPrivacy(prev => ({
      ...prev,
      enabled: level !== 'off',
      level,
    }));
  }, []);

  // Atajo de teclado global Ctrl+Shift+P
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [toggle]);

  // Clase CSS para aplicar a montos
  const moneyClass = privacy.enabled
    ? privacy.level === 'hide'
      ? 'nexus-privacy-hide'
      : 'nexus-privacy-blur'
    : '';

  // Función para renderizar un monto con privacidad
  const renderMoney = useCallback((
    amount: number | string,
    currency: string = '$',
    className: string = ''
  ) => {
    const formatted = typeof amount === 'number'
      ? `${currency}${amount.toFixed(2)}`
      : `${currency}${amount}`;

    if (!privacy.enabled) {
      return { text: formatted, className };
    }

    if (privacy.level === 'hide') {
      return { text: '****', className: `${className} nexus-privacy-hide` };
    }

    // blur
    return { text: formatted, className: `${className} nexus-privacy-blur` };
  }, [privacy.enabled, privacy.level]);

  return {
    privacy,
    toggle,
    setLevel,
    moneyClass,
    renderMoney,
    isBlurred: privacy.enabled && privacy.level === 'blur',
    isHidden: privacy.enabled && privacy.level === 'hide',
    isActive: privacy.enabled,
  };
}
