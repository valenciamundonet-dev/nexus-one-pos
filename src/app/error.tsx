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
    console.error("[NexusOne Error]", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: 20,
    }}>
      <div style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: 16,
        padding: "40px 32px",
        maxWidth: 420,
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "linear-gradient(135deg, #ef4444, #dc2626)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: 24,
          color: "white",
        }}>
          !
        </div>
        <h2 style={{ color: "#f1f5f9", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Error en NexusOne POS
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>
          Ocurrio un error inesperado. Esto puede ser temporal.
        </p>
        <p style={{ color: "#64748b", fontSize: 11, marginBottom: 24, fontFamily: "monospace" }}>
          {error.message || "Error desconocido"}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              border: "1px solid #475569",
              background: "transparent",
              color: "#e2e8f0",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          <button
            onClick={() => window.location.href = "/"}
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
        </div>
        {error.digest && (
          <p style={{ color: "#475569", fontSize: 10, marginTop: 16 }}>
            ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
