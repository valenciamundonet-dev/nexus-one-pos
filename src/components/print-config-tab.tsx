"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth-fetch";

interface PrintSettings {
  id: string;
  ticketFontSize: number;
  ticketFontFamily: string;
  ticketHeaderMsg: string;
  ticketFooterMsg: string;
  ticketShowPhone: boolean;
  ticketShowSeller: boolean;
  ticketShowExchange: boolean;
  ticketCurrencyMode: string;
  ticketShowSlogan: boolean;
  ticketBold: boolean;
  ticketPaperWidth: string;
  ticketMarginLeft: number;
  ticketMarginRight: number;
  ticketUseAgent: boolean;
  ticketAgentUrl: string;
  ticketShowCashReceived: boolean;
  ticketShowLogo: boolean;
  ticketHeaderFontSize: number;
  ticketShowInvoiceId: boolean;
  ticketInvoiceIdAlign: string;
  ticketLineSpacing: number;
  ticketColSpacing: number;
  ticketBodyFontSize: number;
  ticketItemFontSize: number;
  ticketTotalFontSize: number;
  ticketFooterFontSize: number;
  ticketRifFontSize: number;
  ticketAddressFontSize: number;
}

interface PrintConfigTabProps {
  settings: PrintSettings;
  onSettingsChange: (s: any) => void;
}

// Simple toggle component since no Switch in shadcn/ui
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-muted'}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span className="text-sm">{label}</span>
    </label>
  );
}

// Font size input with auto preview
function FontSizeInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={32}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-20 text-sm"
        />
        <span className="text-xs text-muted-foreground">
          {value === 0 ? "Auto" : `${value}pt`}
        </span>
        {value > 0 && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onChange(0)}>
            Auto
          </Button>
        )}
      </div>
    </div>
  );
}

// Spacing slider
function SpacingSlider({ value, onChange, label, min = 0.5, max = 3.0 }: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number }) {
  const steps = [];
  for (let i = min; i <= max; i += 0.1) {
    steps.push(Math.round(i * 10) / 10);
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={0.1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 h-2 accent-primary"
        />
        <Badge variant="outline" className="text-xs min-w-[48px] justify-center">
          {value.toFixed(1)}x
        </Badge>
      </div>
    </div>
  );
}

export default function PrintConfigTab({ settings, onSettingsChange }: PrintConfigTabProps) {
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<PrintSettings>({ ...settings });

  useEffect(() => {
    setLocal({ ...settings });
  }, [settings]);

  const update = (key: keyof PrintSettings, value: any) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error al guardar");
      const updated = await res.json();
      onSettingsChange(updated);
      toast.success("Configuracion de impresion guardada");
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const cancelPendingPrints = async () => {
    try {
      const res = await authFetch("/api/print-agent", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Impresiones pendientes canceladas");
      } else {
        toast.error(data.error || "No se pudieron cancelar las impresiones");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al cancelar impresiones");
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* ═══ SECTION 1: TICKET (Prioridad) ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            🖨️ TICKET <Badge variant="secondary" className="text-[10px]">Prioridad</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Configure los tamanos de fuente para cada seccion del ticket. <strong>0 = Auto</strong> (tamano por defecto segun ancho de papel).
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FontSizeInput
              label="📊 Encabezado (Empresa)"
              value={local.ticketHeaderFontSize}
              onChange={(v) => update("ticketHeaderFontSize", v)}
            />
            <FontSizeInput
              label="🪪 RIF"
              value={local.ticketRifFontSize}
              onChange={(v) => update("ticketRifFontSize", v)}
            />
            <FontSizeInput
              label="📍 Direccion"
              value={local.ticketAddressFontSize}
              onChange={(v) => update("ticketAddressFontSize", v)}
            />
            <FontSizeInput
              label="📝 Cuerpo"
              value={local.ticketBodyFontSize}
              onChange={(v) => update("ticketBodyFontSize", v)}
            />
            <FontSizeInput
              label="📋 Items (Tabla)"
              value={local.ticketItemFontSize}
              onChange={(v) => update("ticketItemFontSize", v)}
            />
            <FontSizeInput
              label="💲 Total"
              value={local.ticketTotalFontSize}
              onChange={(v) => update("ticketTotalFontSize", v)}
            />
            <FontSizeInput
              label="🦶 Pie de pagina"
              value={local.ticketFooterFontSize}
              onChange={(v) => update("ticketFooterFontSize", v)}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SpacingSlider
              label="↕️ Espaciado entre lineas"
              value={local.ticketLineSpacing}
              onChange={(v) => update("ticketLineSpacing", v)}
            />
            <SpacingSlider
              label="↔️ Espaciado entre columnas"
              value={local.ticketColSpacing}
              onChange={(v) => update("ticketColSpacing", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ═══ SECTION 2: Alineacion y Visibilidad ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📐 Alineacion y Visibilidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Toggle
              checked={local.ticketShowInvoiceId}
              onChange={(v) => update("ticketShowInvoiceId", v)}
              label="Mostrar Numero de Factura en ticket"
            />
            {local.ticketShowInvoiceId && (
              <div className="ml-10 space-y-2">
                <Label className="text-xs">Alineacion del Numero de Factura</Label>
                <div className="flex gap-2">
                  {(["left", "center", "right"] as const).map((align) => (
                    <Button
                      key={align}
                      variant={local.ticketInvoiceIdAlign === align ? "default" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => update("ticketInvoiceIdAlign", align)}
                    >
                      {align === "left" ? "⬅ Izquierda" : align === "center" ? "⬛ Centro" : "➡ Derecha"}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <Toggle
              checked={local.ticketShowPhone}
              onChange={(v) => update("ticketShowPhone", v)}
              label="Mostrar telefono"
            />
            <Toggle
              checked={local.ticketShowSeller}
              onChange={(v) => update("ticketShowSeller", v)}
              label="Mostrar vendedor"
            />
            <Toggle
              checked={local.ticketShowExchange}
              onChange={(v) => update("ticketShowExchange", v)}
              label="Mostrar tasa de cambio"
            />
            <Toggle
              checked={local.ticketShowSlogan}
              onChange={(v) => update("ticketShowSlogan", v)}
              label="Mostrar slogan (negrita en footer)"
            />
            <Toggle
              checked={local.ticketShowCashReceived}
              onChange={(v) => update("ticketShowCashReceived", v)}
              label="Mostrar efectivo recibido"
            />
            <Toggle
              checked={local.ticketShowLogo}
              onChange={(v) => update("ticketShowLogo", v)}
              label="Mostrar logo"
            />
          </div>
        </CardContent>
      </Card>

      {/* ═══ SECTION 3: Papel y Margenes ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📄 Papel y Margenes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Ancho del papel</Label>
            <div className="flex gap-2">
              {["55mm", "57mm", "58mm", "80mm"].map((w) => (
                <Button
                  key={w}
                  variant={local.ticketPaperWidth === w ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => update("ticketPaperWidth", w)}
                >
                  {w}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Margen izquierdo (mm)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={local.ticketMarginLeft}
                onChange={(e) => update("ticketMarginLeft", parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Margen derecho (mm)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={local.ticketMarginRight}
                onChange={(e) => update("ticketMarginRight", parseFloat(e.target.value) || 0)}
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ SECTION 4: Agente de Impresion ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🤖 Agente de Impresion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            checked={local.ticketUseAgent}
            onChange={(v) => update("ticketUseAgent", v)}
            label="Usar agente de impresion local (ESC/POS)"
          />

          {local.ticketUseAgent && (
            <div className="ml-10 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">URL del Agente</Label>
                <Input
                  value={local.ticketAgentUrl}
                  onChange={(e) => update("ticketAgentUrl", e.target.value)}
                  placeholder="http://localhost:9100"
                  className="text-sm"
                />
              </div>
              <Button variant="destructive" size="sm" onClick={cancelPendingPrints} className="text-xs">
                ❌ Cancelar Impresiones Pendientes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ SECTION 5: Presupuestos y Notas de Entrega ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">📋 Presupuestos y Notas de Entrega</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 border border-dashed">
            <span className="text-2xl">🚧</span>
            <div>
              <p className="text-sm font-medium">Proximamente</p>
              <p className="text-xs text-muted-foreground">
                Configuracion de fuente y formato para presupuestos y notas de entrega estara disponible en una futura actualizacion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ SAVE BUTTON ═══ */}
      <div className="flex gap-3">
        <Button onClick={save} disabled={saving} className="flex-1">
          {saving ? "Guardando..." : "💾 Guardar Configuracion de Impresion"}
        </Button>
      </div>
    </div>
  );
}
