"use client";

import { useEffect, useState, useCallback } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [countdown, setCountdown] = useState(10);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error("[Nexus One POS] Error de aplicacion:", error);
  }, [error]);

  // Auto-retry after 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoRetry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAutoRetry = useCallback(() => {
    setRetrying(true);
    // Clear any stale data that might cause the error
    try {
      // Only clear app data, not auth data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('nexus-cart') || key.includes('nexus-tab') || key.includes('nexus-pending'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {}
    // Small delay before reset to let state settle
    setTimeout(() => reset(), 300);
  }, [reset]);

  const clearAndReload = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.href = window.location.origin;
  };

  let errorDetail = error?.message || "Error desconocido";
  let isReactError = false;
  if (errorDetail.includes("react.dev/errors/")) {
    isReactError = true;
    const match = errorDetail.match(/react\.dev\/errors\/(\d+)/);
    if (match) {
      const code = match[1];
      const reactErrors: Record<string, string> = {
        '310': 'Error de hidratacion SSR/Cliente. Se intento renderizar un objeto como texto. Posible causa: datos de API con formato inesperado o cache antiguo del navegador.',
        '301': 'Etiqueta HTML no reconocida. Posible causa: cache antiguo del navegador.',
        '418': 'Error de hidratacion: el HTML del servidor no coincide con el cliente.',
        '425': 'Diferencia de texto entre servidor y cliente durante hidratacion.',
      };
      errorDetail = reactErrors[code] || `React error #${code} — Diferencia entre servidor y cliente. Recargue la pagina.`;
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#1e293b",
        border: isReactError ? "1px solid #f59e0b" : "1px solid #334155",
        borderRadius: "12px",
        padding: "40px",
        maxWidth: "500px",
        width: "100%",
        margin: "20px",
        textAlign: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{
          width: "56px",
          height: "56px",
          background: isReactError
            ? "linear-gradient(135deg, #f59e0b, #d97706)"
            : "linear-gradient(135deg, #ef4444, #dc2626)",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: "24px",
          color: "#fff",
        }}>
          {isReactError ? "!" : "X"}
        </div>
        <h2 style={{ color: "#f1f5f9", fontSize: "18px", marginBottom: "8px" }}>
          Error inesperado
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "20px", lineHeight: "1.5" }}>
          Ocurrio un error al cargar la aplicacion.
          {isReactError ? ' Esto es un error de compatibilidad y se recargara automaticamente.' : ' Esto puede deberse a una interrupcion del servidor.'}
        </p>
        {error?.message && (
          <p style={{
            color: "#fca5a5",
            fontSize: "11px",
            fontFamily: "monospace",
            background: "#0f172a",
            padding: "8px 12px",
            borderRadius: "6px",
            marginBottom: "16px",
            wordBreak: "break-all",
            textAlign: "left",
            maxHeight: "80px",
            overflow: "auto",
          }}>
            {errorDetail}
          </p>
        )}
        {!isReactError && (
          <p style={{ color: "#64748b", fontSize: "11px", marginBottom: "16px" }}>
            Si persiste: ejecute INICIAR-TODO.bat para ver detalles en consola.<br/>
            Para instalar limpio: ejecute INSTALAR-LIMPIO.vbs
          </p>
        )}
        {isReactError && countdown > 0 && (
          <p style={{ color: "#fbbf24", fontSize: "12px", marginBottom: "16px" }}>
            Recargando automaticamente en {countdown}s...
          </p>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => { setRetrying(true); setTimeout(() => reset(), 200); }}
            disabled={retrying}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #334155",
              background: retrying ? "#334155" : "transparent",
              color: retrying ? "#94a3b8" : "#e2e8f0",
              cursor: retrying ? "wait" : "pointer",
              fontSize: "13px",
            }}
          >
            {retrying ? "Recargando..." : "Reintentar"}
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "#fff",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            Recargar Pagina
          </button>
          <button
            onClick={clearAndReload}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #f59e0b",
              background: "transparent",
              color: "#f59e0b",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Limpiar cache
          </button>
        </div>
      </div>
    </div>
  );
}
