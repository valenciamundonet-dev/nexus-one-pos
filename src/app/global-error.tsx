"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          padding: 20,
          margin: 0,
          color: "#e2e8f0",
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
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#f1f5f9" }}>
              Error Critico - NexusOne POS v3.0.0
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>
              Ocurrio un error inesperado en la aplicacion.
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
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}