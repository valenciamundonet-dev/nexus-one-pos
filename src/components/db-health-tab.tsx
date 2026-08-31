"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// ─── Types ──────────────────────────────────────────────────
interface DbHealthData {
  health: {
    isHealthy: boolean;
    walSize: number;
    totalWrites: number;
    lastCheckpoint: number;
    busyRetries: number;
    avgQueryMs: number;
  };
  pragma: {
    journalMode: string;
    synchronous: string;
    cacheSizeKB: number;
    pages: number;
    pageSize: number;
    dbSizeBytes: number;
  };
  tableStats: Array<{ table: string; rows: number }>;
  disk: {
    dbSizeBytes: number;
    walSizeBytes: number;
    totalBytes: number;
    dbSizeMB: string;
    walSizeMB: string;
    totalMB: string;
  };
  issues: string[];
  isOk: boolean;
  timestamp: number;
}

// ─── Helpers ─────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function formatTime(ts: number): string {
  if (!ts) return 'Nunca';
  return new Date(ts).toLocaleTimeString('es-VE');
}

function timeAgo(ts: number): string {
  if (!ts) return 'Nunca';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Hace ' + Math.round(diff / 1000) + 's';
  if (diff < 3600000) return 'Hace ' + Math.round(diff / 60000) + 'min';
  return 'Hace ' + Math.round(diff / 3600000) + 'h';
}

function HealthGauge({ value, max, label, unit, warning, danger }: {
  value: number; max: number; label: string; unit: string;
  warning: number; danger: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const color = value >= danger ? 'bg-red-500' : value >= warning ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{value.toFixed(value < 10 ? 2 : 0)}{unit}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function DbHealthTab() {
  const [data, setData] = useState<DbHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [checkpointResult, setCheckpointResult] = useState<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/db-health');
      if (!res.ok) throw new Error('Error del servidor');
      const json = await res.json();
      setData(json);
      setError("");
    } catch (err: any) {
      setError(err.message || 'Error cargando salud de BD');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    intervalRef.current = setInterval(fetchHealth, 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchHealth]);

  const runCheckpoint = async () => {
    setActionLoading('checkpoint');
    setCheckpointResult(null);
    try {
      const res = await fetch('/api/db-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkpoint' }),
      });
      const json = await res.json();
      setCheckpointResult(json);
      setTimeout(fetchHealth, 500);
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Analizando base de datos...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchHealth}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Salud de Base de Datos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoreo de SQLite con WAL mode, checkpoints y tolerancia a fallos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={data?.isOk ? 'default' : 'destructive'}>
            {data?.isOk ? 'Saludable' : 'Con Alertas'}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refrescar
          </Button>
        </div>
      </div>

      {/* Overall Health Banner */}
      {data && !data.isOk && data.issues.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-300">Alertas Detectadas</p>
                <ul className="mt-1 text-sm text-yellow-600 dark:text-yellow-400 space-y-0.5">
                  {data.issues.map((issue, i) => <li key={i}>• {issue}</li>)}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{data?.disk.dbSizeMB || '0'}</p>
            <p className="text-xs text-muted-foreground">BD en Disco (MB)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{formatBytes(data?.health.walSize || 0)}</p>
            <p className="text-xs text-muted-foreground">WAL Size</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{data?.health.busyRetries || 0}</p>
            <p className="text-xs text-muted-foreground">Reintentos BUSY</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{data?.tableStats.length || 0}</p>
          <p className="text-xs text-muted-foreground">Tablas con Datos</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-sm">Rendimiento</h3>
            <HealthGauge value={data?.health.avgQueryMs || 0} max={500} label="Tiempo Promedio de Query" unit="ms" warning={50} danger={200} />
            <HealthGauge value={data?.health.busyRetries || 0} max={50} label="Reintentos SQLITE_BUSY" unit="" warning={5} danger={20} />
            <HealthGauge value={(data?.health.walSize || 0) / 1024 / 1024} max={20} label="Tamano del WAL" unit="MB" warning={5} danger={10} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Configuracion SQLite (PRAGMA)</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground">Journal Mode</span>
                <p className="font-mono font-bold mt-0.5">{data?.pragma.journalMode || '-'}</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground">Synchronous</span>
                <p className="font-mono font-bold mt-0.5">{data?.pragma.synchronous || '-'}</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground">Cache Size</span>
                <p className="font-mono font-bold mt-0.5">{data?.pragma.cacheSizeKB || 0} KB</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground">Pages / Page Size</span>
                <p className="font-mono font-bold mt-0.5">{data?.pragma.pages || 0} / {formatBytes(data?.pragma.pageSize || 4096)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-muted-foreground">Ultimo Checkpoint</span>
              <span className="font-mono">{timeAgo(data?.health.lastCheckpoint || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Stats */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Registros por Tabla</h3>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {data?.tableStats.map((t) => (
              <div key={t.table} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 text-sm">
                <span className="font-mono text-xs">{t.table}</span>
                <Badge variant="secondary" className="text-[10px] font-mono">{t.rows.toLocaleString()}</Badge>
              </div>
            )) || <p className="text-xs text-muted-foreground">No hay datos</p>}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={runCheckpoint} disabled={actionLoading === 'checkpoint'}>
          {actionLoading === 'checkpoint' ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-foreground mr-2" />
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Forzar WAL Checkpoint
        </Button>
        {checkpointResult && (
          <span className={`text-xs ${checkpointResult.success ? 'text-green-600' : 'text-red-500'}`}>
            {checkpointResult.success ? 'Checkpoint ejecutado correctamente' : checkpointResult.error}
          </span>
        )}
      </div>

      {/* Architecture Note */}
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Acerca del Motor de Base de Datos</p>
          <p>Nexus One usa SQLite con WAL (Write-Ahead Logging) para permitir lecturas concurrentes sin bloqueos. Cada 1000 escrituras se ejecuta un checkpoint automatico. Si el WAL supera 5MB se fuerza un checkpoint. El modo synchronous=NORMAL ofrece un balance entre seguridad y rendimiento para operaciones locales.</p>
        </CardContent>
      </Card>
    </div>
  );
}
