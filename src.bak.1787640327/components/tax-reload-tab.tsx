"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ──────────────────────────────────────────────────
interface TaxStrategy {
  key: string;
  label: string;
  description: string;
  currency: string;
  hasFile: boolean;
}

interface TaxReloadData {
  activeStrategy: {
    key: string;
    label: string;
    description: string;
    currency: string;
  };
  availableStrategies: TaxStrategy[];
  taxConfig: any;
  lastReloadAt: number;
  canHotReload: boolean;
  timestamp: number;
}

// ─── Main Component ──────────────────────────────────────────
export default function TaxReloadTab() {
  const [data, setData] = useState<TaxReloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [switching, setSwitching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [customRate, setCustomRate] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  const fetchTaxStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/tax-reload');
      if (!res.ok) throw new Error('Error del servidor');
      const json = await res.json();
      setData(json);
      setError("");
    } catch (err: any) {
      setError(err.message || 'Error cargando estado fiscal');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxStatus();
  }, [fetchTaxStatus]);

  const switchStrategy = async (key: string) => {
    setSwitching(true);
    setToast(null);
    try {
      const res = await fetch('/api/tax-reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch-strategy', strategy: key }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: json.message, ok: true });
        setTimeout(fetchTaxStatus, 300);
      } else {
        setToast({ msg: json.error || 'Error', ok: false });
      }
    } catch (err: any) {
      setToast({ msg: err.message, ok: false });
    } finally {
      setSwitching(false);
    }
  };

  const saveCustomConfig = async () => {
    const rate = parseFloat(customRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setToast({ msg: 'Tasa invalida. Ingrese un porcentaje entre 0 y 100.', ok: false });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      const config = {
        strategy: 'custom',
        label: customLabel || `Impuesto Personalizado ${rate}%`,
        rate,
        mode: 'excluded',
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch('/api/tax-reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-config', config }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: json.message, ok: true });
        setCustomRate("");
        setCustomLabel("");
        setTimeout(fetchTaxStatus, 300);
      } else {
        setToast({ msg: json.error || 'Error', ok: false });
      }
    } catch (err: any) {
      setToast({ msg: err.message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = async () => {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch('/api/tax-reload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const json = await res.json();
      setToast({ msg: json.message, ok: json.success });
      setTimeout(fetchTaxStatus, 300);
    } catch (err: any) {
      setToast({ msg: err.message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Cargando modulo fiscal...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchTaxStatus}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded-lg text-sm ${toast.ok ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recarga Fiscal en Caliente</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cambie la estrategia de impuestos sin reiniciar el sistema. Los cambios aplican en la proxima venta.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTaxStatus} disabled={loading}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refrescar
        </Button>
      </div>

      {/* Active Strategy */}
      <Card className={data?.canHotReload ? 'border-primary/30' : ''}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Estrategia Activa</p>
              <p className="text-lg font-bold mt-1">{data?.activeStrategy.label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{data?.activeStrategy.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] font-mono">{data?.activeStrategy.key}</Badge>
                <Badge variant="secondary" className="text-[10px]">{data?.activeStrategy.currency}</Badge>
                {data?.lastReloadAt > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    Ultima recarga: {new Date(data.lastReloadAt).toLocaleTimeString('es-VE')}
                  </span>
                )}
              </div>
            </div>
            <div className={`p-3 rounded-xl ${data?.canHotReload ? 'bg-primary/10' : 'bg-muted'}`}>
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Strategies */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Estrategias Disponibles</h3>
        <div className="grid gap-3">
          {data?.availableStrategies.map((s) => {
            const isActive = s.key === data.activeStrategy.key;
            return (
              <Card key={s.key} className={isActive ? 'border-primary ring-1 ring-primary/20' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {s.key === 'venezuela' ? 'VE' : s.key === 'us-sales-tax' ? 'US' : '0%'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.label}</span>
                          {isActive && <Badge variant="default" className="text-[10px]">Activa</Badge>}
                          {!s.hasFile && <Badge variant="outline" className="text-[10px] text-yellow-600">Sin archivo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                      </div>
                    </div>
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => switchStrategy(s.key)}
                        disabled={switching}
                      >
                        {switching ? 'Cambianto...' : 'Activar'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Custom Config */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Configuracion Personalizada</h3>
        <Card>
          <CardContent className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure una tasa de impuesto personalizada que se recargara sin reiniciar el servidor.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tasa de Impuesto (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Ej: 16"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Nombre / Etiqueta (opcional)</Label>
                <Input
                  placeholder="Ej: IVA 16%"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={saveCustomConfig} disabled={saving || !customRate}>
                {saving ? 'Guardando...' : 'Guardar y Recargar'}
              </Button>
              <Button variant="outline" onClick={resetConfig} disabled={saving}>
                Restablecer a Por Defecto
              </Button>
            </div>

            {/* Current Config Preview */}
            {data?.taxConfig && (
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Configuracion Fiscal Actual (tax-config.json)</p>
                <pre className="text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">{JSON.stringify(data.taxConfig, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Architecture Note */}
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Acerca del Tax Adapter Pattern</p>
          <p>Cada estrategia fiscal es un modulo independiente que implementa la interfaz TaxStrategy. El POS es agnostico al pais o tipo de impuesto: solo llama a calculateTaxes(items, options) y recibe un TaxCalculation con subtotal, desglose de impuestos y total. Las estrategias se pueden anadir, modificar o eliminar sin afectar el nucleo del sistema.</p>
        </CardContent>
      </Card>
    </div>
  );
}
