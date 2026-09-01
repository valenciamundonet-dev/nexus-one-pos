"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Nexus One POS] Error de aplicacion:", error);
  }, [error]);

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
        border: "1px solid #334155",
        borderRadius: "12px",
        padding: "40px",
        maxWidth: "460px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{
          width: "56px",
          height: "56px",
          background: "linear-gradient(135deg, #ef4444, #dc2626)",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: "24px",
          color: "#fff",
        }}>
          !
        </div>
        <h2 style={{ color: "#f1f5f9", fontSize: "18px", marginBottom: "8px" }}>
          Error inesperado
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "24px", lineHeight: "1.5" }}>
          Ocurrio un error al cargar la aplicacion.
          Esto puede deberse a una interrupcion del servidor.
        </p>
        {error?.message && (
          <p style={{
            color: "#fca5a5",
            fontSize: "11px",
            fontFamily: "monospace",
            background: "#0f172a",
            padding: "8px 12px",
            borderRadius: "6px",
            marginBottom: "20px",
            wordBreak: "break-all",
            textAlign: "left",
          }}>
            {error.message}
          </p>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #334155",
              background: "transparent",
              color: "#e2e8f0",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Reintentar
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
        </div>
      </div>
    </div>
  );
}
