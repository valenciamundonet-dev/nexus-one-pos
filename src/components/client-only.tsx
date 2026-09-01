"use client";

import { useState, useEffect, ReactNode } from 'react';

/**
 * Wrapper que solo renderiza sus hijos en el cliente (después del mount).
 * Útil para componentes que usan portales (como Sonner Toaster)
 * que causan errores de hidratación cuando se renderizan en el servidor.
 */
export default function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <>{children}</>;
}
