"use client";

import { Toaster } from 'sonner';
import ClientOnly from './client-only';

/**
 * Toaster seguro que solo se monta en el cliente.
 * Evita errores de portal/hidratación con React 19 + Sonner.
 */
export default function AppToaster() {
  return (
    <ClientOnly>
      <Toaster position="top-right" richColors />
    </ClientOnly>
  );
}
