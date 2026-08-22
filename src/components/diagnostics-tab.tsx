"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────
interface PeripheralStatus {
  name: string;
  label: string;
  icon: string;
  state: string;
  failures: number;
  queuePending: number;
  stateLabel: string;
  stateColor: string;
}

interface PrintAgentStatus {
  online: boolean;
  responseTimeMs?: number;
  error?: string;
  printers?: string[];
}

interface DiagnosticsData {
  peripherals: PeripheralStatus[];
  printAgent: PrintAgentStatus;
  summary: {
    totalPeripherals: number;
    operational: number;
    failed: number;
    recovering: number;
    queuedOperations: number;
    hasAlerts: boolean;
  };
  timestamp: number;
}

// ─── Icon helpers (SVG inline para evitar dependencias) ───────
function PeripheralIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = className || "w-5 h-5";
  if (icon === "receipt") return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
    </svg>
  );
  if (icon === "scan") return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  );
}

function StatusDot({ color }: { color: string }) {
  const bg = color === 'green' ? 'bg-green-500' : color === 'red' ? 'bg-red-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-gray-400';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${bg} ${color === 'green' ? 'shadow-[0_0_6px_rgba(34,197,94,0.5)]' : color === 'red' ? 'shadow-[0_0_6px_rgba(239,68,68,0.5)]' : ''}`} />;
}

// ─── Main Component ──────────────────────────────────────────
export default function DiagnosticsTab() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    try {
      const res = await fetch('/api/diagnostics');
      if (!res.ok) throw new Error('Error del servidor');
      const json = await res.json();
      setData(json);
      setError("");
    } catch (err: any) {
      setError(err.message || 'Error cargando diagnostico');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostics();
    intervalRef.current = setInterval(fetchDiagnostics, 10000); // Auto-refresh cada 10s
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchDiagnostics]);

  const resetPeripheral = async (name: string) => {
    setActionLoading(name);
    try {
      const res = await fetch('/api/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-peripheral', peripheral: name }),
      });
      const json = await res.json();
      if (json.success) {
        setTimeout(fetchDiagnostics, 500);
      }
    } finally {
      setActionLoading("");
    }
  };

  const testPrintAgent = async () => {
    setActionLoading('print-agent');
    setTestResult(null);
    try {
      const res = await fetch('/api/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test-print-agent' }),
      });
      const json = await res.json();
      setTestResult(json);
      setTimeout(fetchDiagnostics, 500);
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Cargando diagnostico...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchDiagnostics}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Diagnostico de Perifericos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoreo en tiempo real del Circuit Breaker y estado de hardware conectado.
            Auto-refresco cada 10s.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDiagnostics} disabled={loading}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refrescar
        </Button>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className={data.summary.operational === data.summary.totalPeripherals ? 'border-green-200 dark:border-green-800' : ''}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.summary.operational}</p>
              <p className="text-xs text-muted-foreground">Operativos</p>
            </CardContent>
          </Card>
          <Card className={data.summary.failed > 0 ? 'border-red-200 dark:border-red-800' : ''}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.summary.failed}</p>
              <p className="text-xs text-muted-foreground">Fallidos</p>
            </CardContent>
          </Card>
          <Card className={data.summary.recovering > 0 ? 'border-yellow-200 dark:border-yellow-800' : ''}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data.summary.recovering}</p>
              <p className="text-xs text-muted-foreground">Recuperando</p>
            </CardContent>
          </Card>
          <Card className={data.summary.queuedOperations > 0 ? 'border-orange-200 dark:border-orange-800' : ''}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.summary.queuedOperations}</p>
              <p className="text-xs text-muted-foreground">En Cola</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Peripheral Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Circuit Breaker — Estado por Periferico</h3>
        <div className="grid gap-3">
          {data?.peripherals.map((p) => (
            <Card key={p.name} className={
              p.state === 'open' ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20' :
              p.state === 'half-open' ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20' :
              'border-green-200 dark:border-green-800'
            }>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      p.state === 'closed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                      p.state === 'open' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                    }`}>
                      <PeripheralIcon icon={p.icon} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.label}</span>
                        <StatusDot color={p.stateColor} />
                        <Badge variant={p.state === 'closed' ? 'default' : p.state === 'open' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {p.stateLabel}
                        </Badge>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Fallos: <strong className="text-foreground">{p.failures}</strong></span>
                        <span>En cola: <strong className="text-foreground">{p.queuePending}</strong></span>
                        <span className="font-mono">{p.state}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.state !== 'closed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resetPeripheral(p.name)}
                        disabled={actionLoading === p.name}
                      >
                        {actionLoading === p.name ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                        ) : 'Reiniciar'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Print Agent Status */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Print Agent (localhost:9100)</h3>
        <Card className={data?.printAgent.online ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${data?.printAgent.online ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Agente de Impresion</span>
                    <StatusDot color={data?.printAgent.online ? 'green' : 'red'} />
                    <Badge variant={data?.printAgent.online ? 'default' : 'destructive'} className="text-[10px]">
                      {data?.printAgent.online ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  {data?.printAgent.online && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Tiempo de respuesta: <strong className="text-foreground">{data.printAgent.responseTimeMs}ms</strong>
                      {data.printAgent.printers && data.printAgent.printers.length > 0 && (
                        <span className="ml-2">| Impresoras: <strong className="text-foreground">{data.printAgent.printers.length}</strong></span>
                      )}
                    </p>
                  )}
                  {!data?.printAgent.online && data?.printAgent.error && (
                    <p className="text-xs text-red-500 mt-1">{data.printAgent.error}</p>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={testPrintAgent} disabled={actionLoading === 'print-agent'}>
                {actionLoading === 'print-agent' ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                ) : 'Probar Conexion'}
              </Button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`mt-3 p-2 rounded text-xs ${testResult.success ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                {testResult.success ? (
                  <span>Conexion exitosa — {testResult.responseTimeMs}ms. Impresoras detectadas: {JSON.stringify(testResult.printers)}</span>
                ) : (
                  <span>Error: {testResult.error}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Architecture Info */}
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Acerca del Circuit Breaker</p>
          <p>Los perifericos estan protegidos por un patron Circuit Breaker que los aisla del hilo principal del POS. Si un periferico falla repetidamente, el circuito se abre y las operaciones se encolan para reintentar automaticamente cuando el periferico se recupere.</p>
          <p><strong>Estados:</strong> CLOSED (operativo) → OPEN (desconectado, en cooldown) → HALF_OPEN (probando recuperacion) → CLOSED</p>
        </CardContent>
      </Card>
    </div>
  );
}
