"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Nexus One POS — Error Page
 * 
 * CRITICAL: Shows the FULL raw error message so we can diagnose issues.
 * Does NOT auto-reload to prevent infinite error loops.
 */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("[Nexus One POS] ========== RENDER ERROR ==========");
    console.error("[Nexus One POS] Error:", error?.message);
    if (error?.stack) console.error("[Nexus One POS] Stack:", error?.stack);
    console.error("[Nexus One POS] Digest:", error?.digest);
    console.error("[Nexus One POS] ========================================");
  }, [error]);

  // Detectar tipo de error
  let errorType = "unknown";
  let errorHint = "";
  const msg = error?.message || "";

  if (msg.includes("Objects are not valid") || msg.includes("object with keys")) {
    errorType = "object-render";
    errorHint = "Un componente intento renderizar un objeto JavaScript como texto. Verifique que todos los valores de la API sean strings/numeros, no objetos.";
  } else if (msg.includes("hydration") || msg.includes("Hydration") || msg.includes("server")) {
    errorType = "hydration";
    errorHint = "Error de hidratacion entre servidor y cliente.";
  } else if (msg.includes("Minimum update depth") || msg.includes("Too many re-renders")) {
    errorType = "rerender";
    errorHint = "Demasiadas actualizaciones de estado en un componente.";
  } else if (msg.includes("Network") || msg.includes("fetch") || msg.includes("Failed to fetch")) {
    errorType = "network";
    errorHint = "Error de red al conectar con el servidor.";
  }

  const isReactError = msg.includes("react.dev/errors/");
  const errorColor = isReactError ? "#f59e0b" : "#ef4444";

  const clearAndReload = () => {
    try { localStorage.clear(); } catch {}
    window.location.href = window.location.origin;
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{
        background: "#1e293b",
        border: `1px solid ${errorColor}`,
        borderRadius: "12px",
        padding: "40px",
        maxWidth: "600px",
        width: "100%",
        margin: "20px",
        textAlign: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{
          width: "56px", height: "56px",
          background: `linear-gradient(135deg, ${errorColor}, ${errorColor}dd)`,
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: "24px",
          color: "#fff",
        }}>{"!"}</div>
        <h2 style={{ color: "#f1f5f9", fontSize: "18px", marginBottom: "8px" }}>Error inesperado</h2>
        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "16px", lineHeight: "1.5" }}>
          Ocurrio un error al cargar la aplicacion.
          {errorHint && <span style={{ color: errorColor }}> {errorHint}</span>}
        </p>

        {/* Raw error message - ALWAYS visible */}
        {error?.message && (
          <div style={{
            textAlign: "left",
            background: "#0f172a",
            padding: "12px",
            borderRadius: "6px",
            marginBottom: "12px",
            border: "1px solid #334155",
          }}>
            <p style={{ color: "#fca5a5", fontSize: "11px", fontFamily: "monospace", wordBreak: "break-all", whiteSpace: "pre-wrap", margin: 0 }}>
              {error.message}
            </p>
            {error.digest && (
              <p style={{ color: "#64748b", fontSize: "10px", fontFamily: "monospace", marginTop: "8px", marginBottom: 0 }}>
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Stack trace - expandable */}
        {error?.stack && (
          <div style={{ marginBottom: "16px" }}>
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: "transparent",
                border: "1px solid #334155",
                borderRadius: "4px",
                color: "#94a3b8",
                fontSize: "11px",
                padding: "4px 12px",
                cursor: "pointer",
              }}
            >
              {showDetails ? "Ocultar" : "Ver"} stack trace
            </button>
            {showDetails && (
              <pre style={{
                textAlign: "left",
                background: "#0f172a",
                padding: "12px",
                borderRadius: "6px",
                marginTop: "8px",
                color: "#94a3b8",
                fontSize: "10px",
                fontFamily: "monospace",
                maxHeight: "200px",
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                margin: 0,
              }}>
                {error.stack}
              </pre>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
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
          >Reintentar</button>
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
          >Limpiar cache y recargar</button>
        </div>

        <p style={{ color: "#475569", fontSize: "10px", marginTop: "16px" }}>
          Si persiste: ejecute INICIAR-TODO.bat para ver detalles en consola.<br/>
          Para instalar limpio: ejecute INSTALAR-LIMPIO.vbs
        </p>
      </div>
    </div>
  );
}
