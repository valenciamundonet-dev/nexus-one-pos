"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GLOBAL ERROR]", error);
    console.error("[GLOBAL ERROR] message:", error?.message);
    console.error("[GLOBAL ERROR] stack:", error?.stack);
  }, [error]);

  const clearAndReload = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.href = window.location.origin;
  };

  let errorDetail = error?.message || "Error desconocido";
  if (errorDetail.includes("react.dev/errors/")) {
    const match = errorDetail.match(/react\.dev\/errors\/(\d+)/);
    if (match) {
      const code = match[1];
      const reactErrors: Record<string, string> = {
        '310': 'Se intento renderizar un objeto como texto. Posible causa: datos de API con formato inesperado o cache antiguo del navegador.',
      };
      errorDetail = reactErrors[code] || `React error #${code}`;
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#1e293b", border: "1px solid #ef4444", borderRadius: "12px",
        padding: "40px", maxWidth: "520px", width: "100%", margin: "20px",
        textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
        <h2 style={{ color: "#f1f5f9", fontSize: "18px", marginBottom: "8px" }}>Error inesperado</h2>
        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "24px" }}>Ocurrio un error al cargar la aplicacion.</p>
        <div style={{
          color: "#fca5a5", fontSize: "11px", fontFamily: "monospace",
          background: "#0f172a", padding: "12px", borderRadius: "6px",
          marginBottom: "20px", wordBreak: "break-all", textAlign: "left",
          whiteSpace: "pre-wrap",
        }}>{errorDetail}</div>
        <p style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "20px" }}>
          Si persiste: ejecute INICIAR-TODO.bat para ver detalles en consola.<br/>
          Para instalar limpio: ejecute INSTALAR-LIMPIO.vbs
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => reset()} style={{
            padding: "10px 20px", borderRadius: "8px", border: "1px solid #334155",
            background: "transparent", color: "#e2e8f0", cursor: "pointer", fontSize: "13px",
          }}>Reintentar</button>
          <button onClick={() => window.location.reload()} style={{
            padding: "10px 20px", borderRadius: "8px", border: "none",
            background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff",
            cursor: "pointer", fontSize: "13px", fontWeight: "600",
          }}>Recargar</button>
          <button onClick={clearAndReload} style={{
            padding: "10px 20px", borderRadius: "8px", border: "1px solid #f59e0b",
            background: "transparent", color: "#f59e0b", cursor: "pointer", fontSize: "13px",
          }}>Limpiar cache y recargar</button>
        </div>
      </div>
    </div>
  );
}