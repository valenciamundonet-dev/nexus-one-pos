"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Plus, HandCoins, Clock } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

function sn(v: any): number {
  if (v === null || v === undefined || v === "" || typeof v === "boolean") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

interface Payable {
  id: string;
  supplierId?: string;
  supplier?: { id: string; name: string; rif: string };
  purchaseId?: string;
  purchase?: { id: string; number: string; totalUsd: number };
  description: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  dueDate?: string;
  paymentTerms: string;
  notes: string;
  _count?: { payments: number };
}

interface PayablePayment {
  id: string;
  date: string;
  amount: number;
  amountBs: number;
  method: string;
  reference: string;
  notes: string;
  createdBy: string;
}

interface AccountsPayableTabProps {
  bcvRate: number;
  sellerName: string;
}

export default function AccountsPayableTab({ bcvRate, sellerName }: AccountsPayableTabProps) {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payments, setPayments] = useState<PayablePayment[]>([]);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [paying, setPaying] = useState<Payable | null>(null);
  const [totalBalanceUsd, setTotalBalanceUsd] = useState(0);
  const [totalBalanceBs, setTotalBalanceBs] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const [payForm, setPayForm] = useState({ amount: "", method: "efectivo", reference: "", notes: "" });
  const [createForm, setCreateForm] = useState({
    supplierId: "", description: "", totalAmount: "", dueDate: "", paymentTerms: "", notes: ""
  });

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  const loadSuppliers = async () => {
    try {
      const res = await authFetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data.map((s: any) => ({ id: s.id, name: s.name })) : []);
      }
    } catch {}
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/accounts-payable");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPayables(data.payables || []);
      setTotalBalanceUsd(sn(data.totalBalanceUsd));
      setTotalBalanceBs(sn(data.totalBalanceBs));
      setOverdueCount(sn(data.overdueCount));
    } catch {
      toast.error("Error al cargar cuentas por pagar");
      setPayables([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); loadSuppliers(); }, []);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); setPayments([]); return; }
    setExpanded(id);
    try {
      const res = await authFetch(`/api/accounts-payable?payableId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data.payments) ? data.payments.map((p: any) => ({
          id: p.id, date: p.date, amount: sn(p.amount), amountBs: sn(p.amountBs),
          method: p.method, reference: p.reference, notes: p.notes, createdBy: p.createdBy,
        })) : []);
      }
    } catch { setPayments([]); }
  };

  const openPay = (p: Payable) => { setPaying(p); setPayForm({ amount: "", method: "efectivo", reference: "", notes: "" }); setShowPayDialog(true); };

  const registerPayment = async () => {
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) { toast.error("Monto invalido"); return; }
    if (!paying) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/accounts-payable", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", payableId: paying.id, amount, method: payForm.method, reference: payForm.reference, notes: payForm.notes, createdBy: sellerName, exchangeRate: bcvRate }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Error"); }
      toast.success(`Abono registrado: $${amount.toFixed(2)}`);
      setShowPayDialog(false);
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const createPayable = async () => {
    const totalAmount = parseFloat(createForm.totalAmount);
    if (!createForm.description || isNaN(totalAmount) || totalAmount <= 0) { toast.error("Descripcion y monto son requeridos"); return; }
    setSaving(true);
    try {
      const res = await authFetch("/api/accounts-payable", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, totalAmount, supplierId: createForm.supplierId || null, dueDate: createForm.dueDate || null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Cuenta por pagar creada");
      setShowCreateDialog(false);
      setCreateForm({ supplierId: "", description: "", totalAmount: "", dueDate: "", paymentTerms: "", notes: "" });
      await load();
    } catch { toast.error("Error al crear cuenta por pagar"); }
    finally { setSaving(false); }
  };

  const STATUS_STYLES: Record<string, string> = {
    PENDIENTE: "bg-red-100 text-red-700 border-red-300",
    PARCIAL: "bg-amber-100 text-amber-700 border-amber-300",
    PAGADA: "bg-green-100 text-green-700 border-green-300",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-red-200 bg-red-50/50">
          <p className="text-xl font-bold text-red-600">${totalBalanceUsd.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total por Pagar USD</p>
        </Card>
        <Card className="p-3 border-orange-200 bg-orange-50/50">
          <p className="text-xl font-bold text-orange-600">Bs. {totalBalanceBs.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total por Pagar Bs</p>
        </Card>
        <Card className="p-3">
          <p className="text-xl font-bold">{payables.length}</p>
          <p className="text-xs text-muted-foreground">Cuentas por Pagar</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-xl font-bold text-amber-600">{overdueCount}</p>
          </div>
          <p className="text-xs text-muted-foreground">Vencidas</p>
        </Card>
      </div>

      {overdueCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800">{overdueCount} cuenta(s) vencida(s) pendiente(s) de pago</span>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreateDialog(true)}><Plus className="h-4 w-4 mr-1" />Nueva Cuenta</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {payables.map((p) => {
              const isOverdue = p.dueDate && new Date(p.dueDate) < new Date() && p.status !== "PAGADA";
              return (
                <div key={p.id}>
                  <button onClick={() => toggleExpand(p.id)} className="w-full text-left p-3 hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><FileText className="h-5 w-5" /></div>
                      <div>
                        <p className="font-medium text-sm">{p.description}</p>
                        <p className="text-xs text-muted-foreground">{p.supplier?.name || "Sin proveedor"} {p.supplier?.rif ? `| ${p.supplier.rif}` : ""}
                        {p.dueDate && <span className={isOverdue ? "text-red-500 font-bold ml-2" : "text-muted-foreground ml-2"}>Vence: {new Date(p.dueDate).toLocaleDateString("es-VE")}</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`text-[9px] ${STATUS_STYLES[p.status] || ""}`} variant="outline">{p.status}</Badge>
                      <div className="text-right">
                        <p className="font-bold text-sm">${sn(p.totalAmount).toFixed(2)}</p>
                        {p.status !== "PAGADA" && <p className="text-xs text-red-600">Pendiente: ${sn(p.balance).toFixed(2)}</p>}
                      </div>
                      {expanded === p.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>
                  {expanded === p.id && (
                    <div className="bg-muted/20 p-3 border-t space-y-2">
                      <div className="flex justify-between text-xs"><span>Pagado: ${sn(p.paidAmount).toFixed(2)}</span><span>Balance: ${sn(p.balance).toFixed(2)}</span></div>
                      {payments.length > 0 && <p className="text-[10px] font-medium text-muted-foreground uppercase">Abonos ({payments.length})</p>}
                      {payments.map((pay) => (
                        <div key={pay.id} className="flex items-center justify-between text-xs p-1 bg-green-50 rounded">
                          <div className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-green-500" /><span>{pay.date ? new Date(pay.date).toLocaleDateString("es-VE") : ""}</span><Badge variant="secondary" className="text-[8px]">{pay.method}</Badge>{pay.reference && <span className="text-muted-foreground">Ref: {pay.reference}</span>}</div>
                          <span className="font-bold text-green-600">${sn(pay.amount).toFixed(2)}</span>
                        </div>
                      ))}
                      {p.status !== "PAGADA" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openPay(p); }}><HandCoins className="h-3 w-3 mr-1" />Abonar</Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {payables.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? "Cargando..." : <><FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />No hay cuentas por pagar</>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5 text-green-600" />Registrar Abono</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {paying && <div className="p-2 bg-muted rounded text-xs"><p>Pendiente: <strong className="text-red-600">${sn(paying.balance).toFixed(2)}</strong></p><p>Total: ${sn(paying.totalAmount).toFixed(2)} | Pagado: ${sn(paying.paidAmount).toFixed(2)}</p></div>}
            <div><Label>Monto (USD) *</Label><Input type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="text-lg font-bold text-center h-14" /><p className="text-xs text-muted-foreground mt-1">Bs. {(parseFloat(payForm.amount || "0") * bcvRate).toFixed(2)}</p></div>
            <div><Label>Metodo de Pago</Label><select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="efectivo">Efectivo (Bs)</option><option value="transferencia">Transferencia</option><option value="pago-movil">Pago Movil</option><option value="zelle">Zelle ($)</option><option value="usdt">USDT ($)</option></select></div>
            {payForm.method !== "efectivo" && <div><Label>Referencia</Label><Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} /></div>}
            <div><Label>Notas</Label><Input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={registerPayment} disabled={saving || !payForm.amount}>{saving ? "Registrando..." : `Registrar Abono — $${parseFloat(payForm.amount || "0").toFixed(2)}`}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nueva Cuenta por Pagar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Proveedor</Label><select value={createForm.supplierId} onChange={(e) => setCreateForm({ ...createForm, supplierId: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Sin proveedor</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><Label>Descripcion *</Label><Input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Descripcion de la deuda" /></div>
            <div><Label>Monto Total (USD) *</Label><Input type="number" step="0.01" value={createForm.totalAmount} onChange={(e) => setCreateForm({ ...createForm, totalAmount: e.target.value })} className="text-lg font-bold" /></div>
            <div><Label>Fecha de Vencimiento</Label><Input type="date" value={createForm.dueDate} onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })} /></div>
            <div><Label>Condiciones de Pago</Label><Input value={createForm.paymentTerms} onChange={(e) => setCreateForm({ ...createForm, paymentTerms: e.target.value })} placeholder="Ej: 30 dias, 15/30/60" /></div>
            <div><Label>Notas</Label><Input value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={createPayable} disabled={saving}>{saving ? "Creando..." : "Crear Cuenta por Pagar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
