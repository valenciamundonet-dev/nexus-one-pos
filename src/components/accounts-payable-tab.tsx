"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { authFetch } from "@/lib/auth-fetch";
import {
  Plus, Search, Trash2, Eye, DollarSign, AlertTriangle,
  Calendar, FileText, ChevronDown, ChevronUp, X, Wallet,
  ArrowDownLeft, Clock, CheckCircle2, Ban
} from "lucide-react";

// Safe number helper
function sn(v: any): number {
  if (v === null || v === undefined || v === "" || typeof v === "boolean") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

interface Supplier {
  id: string;
  name: string;
  rif: string;
}

interface PayablePayment {
  id: string;
  date: string;
  amountUsd: number;
  amountBs: number;
  exchangeRate: number;
  method: string;
  reference: string;
  notes: string;
  createdBy: string;
}

interface PayableAccount {
  id: string;
  supplierId: string | null;
  purchaseId: string | null;
  description: string;
  totalUsd: number;
  totalBs: number;
  paidUsd: number;
  paidBs: number;
  remainingUsd: number;
  remainingBs: number;
  exchangeRate: number;
  dueDate: string | null;
  status: string;
  notes: string;
  supplier: { id: string; name: string; rif: string } | null;
  _count: { payments: number };
  createdAt: string;
  updatedAt: string;
}

interface PayableDetail extends Omit<PayableAccount, '_count'> {
  payments: PayablePayment[];
}

interface AccountsPayableTabProps {
  bcvRate: number;
  currency: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="w-3 h-3" /> },
  parcial: { label: 'Parcial', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <ArrowDownLeft className="w-3 h-3" /> },
  pagada: { label: 'Pagada', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  vencida: { label: 'Vencida', color: 'bg-red-100 text-red-800 border-red-200', icon: <Ban className="w-3 h-3" /> },
};

const PAY_METHODS: { value: string; label: string }[] = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo (Bs)' },
  { value: 'pago-movil', label: 'Pago Móvil' },
  { value: 'zelle', label: 'Zelle ($)' },
];

export default function AccountsPayableTab({ bcvRate, currency }: AccountsPayableTabProps) {
  // Data
  const [payables, setPayables] = useState<PayableAccount[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialogs
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<PayableDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Forms
  const [newForm, setNewForm] = useState({
    supplierId: '', description: '', totalUsd: '', exchangeRate: String(bcvRate), dueDate: '', notes: '',
  });
  const [payForm, setPayForm] = useState({
    amountUsd: '', exchangeRate: String(bcvRate), method: 'transferencia', reference: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load suppliers
  const loadSuppliers = async () => {
    try {
      const res = await authFetch('/api/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data.map((s: any) => ({ id: s.id, name: s.name, rif: s.rif || '' })) : []);
      }
    } catch { /* ignore */ }
  };

  // Load payables
  const loadPayables = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'todos') params.set('status', filterStatus);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await authFetch(`/api/accounts-payable?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Error al cargar cuentas por pagar');
        setPayables([]);
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) { setPayables([]); return; }
      const sanitized: PayableAccount[] = data.map((p: any) => ({
        id: p.id || '',
        supplierId: p.supplierId || null,
        purchaseId: p.purchaseId || null,
        description: p.description || '',
        totalUsd: sn(p.totalUsd),
        totalBs: sn(p.totalBs),
        paidUsd: sn(p.paidUsd),
        paidBs: sn(p.paidBs),
        remainingUsd: sn(p.remainingUsd),
        remainingBs: sn(p.remainingBs),
        exchangeRate: sn(p.exchangeRate),
        dueDate: p.dueDate || null,
        status: p.status || 'pendiente',
        notes: p.notes || '',
        supplier: p.supplier || null,
        _count: { payments: sn(p._count?.payments) },
        createdAt: p.createdAt || '',
        updatedAt: p.updatedAt || '',
      }));

      // Auto-update vencida status for client-side display
      const now = new Date();
      sanitized.forEach((p) => {
        if (p.dueDate && p.status !== 'pagada' && new Date(p.dueDate) < now) {
          p.status = 'vencida';
        }
      });

      setPayables(sanitized);
    } catch (err: any) {
      toast.error('Error de conexión al cargar cuentas por pagar');
      setPayables([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadSuppliers(); }, []);
  useEffect(() => { loadPayables(); }, [filterStatus]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => { loadPayables(); }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Summary calculations
  const pendingUsd = payables.filter(p => p.status === 'pendiente' || p.status === 'parcial' || p.status === 'vencida').reduce((s, p) => s + p.remainingUsd, 0);
  const pendingBs = payables.filter(p => p.status === 'pendiente' || p.status === 'parcial' || p.status === 'vencida').reduce((s, p) => s + p.remainingBs, 0);
  const overdueUsd = payables.filter(p => p.status === 'vencida').reduce((s, p) => s + p.remainingUsd, 0);
  const pendingCount = payables.filter(p => p.status === 'pendiente' || p.status === 'vencida').length;
  const overdueCount = payables.filter(p => p.status === 'vencida').length;

  // Open detail dialog
  const openDetail = async (payable: PayableAccount) => {
    setSelectedPayable(null);
    setShowDetailDialog(true);
    setDetailLoading(true);
    try {
      const res = await authFetch(`/api/accounts-payable/${payable.id}`);
      if (!res.ok) { toast.error('Error al cargar detalle'); setShowDetailDialog(false); return; }
      const data = await res.json();
      const detail: PayableDetail = {
        id: data.id || '',
        supplierId: data.supplierId || null,
        purchaseId: data.purchaseId || null,
        description: data.description || '',
        totalUsd: sn(data.totalUsd),
        totalBs: sn(data.totalBs),
        paidUsd: sn(data.paidUsd),
        paidBs: sn(data.paidBs),
        remainingUsd: sn(data.remainingUsd),
        remainingBs: sn(data.remainingBs),
        exchangeRate: sn(data.exchangeRate),
        dueDate: data.dueDate || null,
        status: data.status || 'pendiente',
        notes: data.notes || '',
        supplier: data.supplier || null,
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
        payments: Array.isArray(data.payments) ? data.payments.map((pp: any) => ({
          id: pp.id || '',
          date: pp.date || '',
          amountUsd: sn(pp.amountUsd),
          amountBs: sn(pp.amountBs),
          exchangeRate: sn(pp.exchangeRate),
          method: pp.method || '',
          reference: pp.reference || '',
          notes: pp.notes || '',
          createdBy: pp.createdBy || '',
        })) : [],
      };
      setSelectedPayable(detail);
    } catch { toast.error('Error al cargar detalle'); setShowDetailDialog(false); }
    finally { setDetailLoading(false); }
  };

  // Open pay dialog
  const openPayDialog = () => {
    if (!selectedPayable) return;
    setPayForm({
      amountUsd: '',
      exchangeRate: String(bcvRate),
      method: 'transferencia',
      reference: '',
      notes: '',
    });
    setShowPayDialog(true);
  };

  // Create new payable
  const handleCreate = async () => {
    if (!newForm.description.trim()) { toast.error('La descripción es requerida'); return; }
    const totalUsd = parseFloat(newForm.totalUsd);
    if (!totalUsd || totalUsd <= 0) { toast.error('El total USD debe ser mayor a 0'); return; }

    setSaving(true);
    try {
      const res = await authFetch('/api/accounts-payable', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: newForm.supplierId || null,
          description: newForm.description.trim(),
          totalUsd,
          exchangeRate: parseFloat(newForm.exchangeRate) || bcvRate,
          dueDate: newForm.dueDate || null,
          notes: newForm.notes,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al crear cuenta');
      }
      toast.success('Cuenta por pagar creada');
      setShowNewDialog(false);
      setNewForm({ supplierId: '', description: '', totalUsd: '', exchangeRate: String(bcvRate), dueDate: '', notes: '' });
      loadPayables();
    } catch (e: any) { toast.error(e.message || 'Error al crear cuenta'); }
    finally { setSaving(false); }
  };

  // Register payment
  const handlePay = async () => {
    const amountUsd = parseFloat(payForm.amountUsd);
    if (!amountUsd || amountUsd <= 0) { toast.error('Ingrese un monto válido'); return; }
    if (!selectedPayable) return;

    if (['transferencia', 'pago-movil', 'zelle'].includes(payForm.method) && !payForm.reference.trim()) {
      toast.error('Debe ingresar el número de referencia');
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch('/api/accounts-payable/payments', {
        method: 'POST',
        body: JSON.stringify({
          payableId: selectedPayable.id,
          amountUsd,
          exchangeRate: parseFloat(payForm.exchangeRate) || bcvRate,
          method: payForm.method,
          reference: payForm.reference,
          notes: payForm.notes,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al registrar pago');
      }
      toast.success(`Pago registrado: $${amountUsd.toFixed(2)}`);
      setShowPayDialog(false);
      // Reload detail and list
      if (selectedPayable) {
        await openDetail(selectedPayable as any);
      }
      loadPayables();
    } catch (e: any) { toast.error(e.message || 'Error al registrar pago'); }
    finally { setSaving(false); }
  };

  // Delete payable
  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta cuenta por pagar?')) return;
    setDeleting(id);
    try {
      const res = await authFetch(`/api/accounts-payable/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al eliminar');
      }
      toast.success('Cuenta eliminada');
      loadPayables();
    } catch (e: any) { toast.error(e.message || 'Error al eliminar'); }
    finally { setDeleting(null); }
  };

  // Mark as paid
  const handleMarkPaid = async (id: string) => {
    try {
      const res = await authFetch('/api/accounts-payable', {
        method: 'PATCH',
        body: JSON.stringify({ id, status: 'pagada' }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al actualizar');
      }
      toast.success('Cuenta marcada como pagada');
      loadPayables();
    } catch (e: any) { toast.error(e.message || 'Error al actualizar'); }
  };

  const showPayRefField = ['transferencia', 'pago-movil', 'zelle'].includes(payForm.method);

  const fmtUsd = (v: number) => `$${v.toFixed(2)}`;
  const fmtBs = (v: number) => `Bs.${v.toFixed(2)}`;
  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const filterOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'parcial', label: 'Parcial' },
    { value: 'pagada', label: 'Pagada' },
    { value: 'vencida', label: 'Vencida' },
  ];

  return (
    <div className="space-y-4">
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Wallet className="w-4 h-4 text-amber-500" />
              <span>Total Pendiente USD</span>
            </div>
            <p className="text-xl font-bold text-amber-700">{fmtUsd(pendingUsd)}</p>
            <p className="text-xs text-muted-foreground mt-1">{fmtBs(pendingBs)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Total Vencido</span>
            </div>
            <p className="text-xl font-bold text-red-700">{fmtUsd(overdueUsd)}</p>
            <p className="text-xs text-muted-foreground mt-1">{overdueCount} cuenta(s) vencida(s)</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>Cuentas Pendientes</span>
            </div>
            <p className="text-xl font-bold text-orange-700">{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Sin pagos registrados</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Total Registros</span>
            </div>
            <p className="text-xl font-bold text-green-700">{payables.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Cuentas por pagar</p>
          </CardContent>
        </Card>
      </div>

      {/* FILTERS BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedor, descripción..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filterOptions.map(opt => (
            <Button
              key={opt.value}
              size="sm"
              variant={filterStatus === opt.value ? 'default' : 'outline'}
              onClick={() => setFilterStatus(opt.value)}
              className="text-xs h-8"
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <Button onClick={() => { setNewForm({ supplierId: '', description: '', totalUsd: '', exchangeRate: String(bcvRate), dueDate: '', notes: '' }); setShowNewDialog(true); }} className="ml-auto">
          <Plus className="w-4 h-4 mr-1.5" /> Nueva Cuenta
        </Button>
      </div>

      {/* TABLE */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : payables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No hay cuentas por pagar</p>
              <p className="text-xs mt-1">Crea una nueva cuenta para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Proveedor</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Descripción</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Total USD</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Pagado USD</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Restante USD</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs">Vencimiento</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs">Estado</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.map((p) => {
                    const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.pendiente;
                    return (
                      <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium max-w-[150px] truncate">
                          {p.supplier?.name || '—'}
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground">
                          {p.description}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {fmtUsd(p.totalUsd)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-green-700">
                          {fmtUsd(p.paidUsd)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          <span className={p.remainingUsd > 0 ? 'text-red-700' : 'text-green-700'}>
                            {fmtUsd(p.remainingUsd)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          <span className={p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'pagada' ? 'text-red-600 font-semibold' : ''}>
                            {fmtDate(p.dueDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={`text-[10px] ${sc.color}`}>
                            <span className="flex items-center gap-1">{sc.icon} {sc.label}</span>
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openDetail(p)} title="Ver detalle">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {p.status !== 'pagada' && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-700 hover:text-green-800" onClick={() => handleMarkPaid(p.id)} title="Marcar pagada">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {(p.status === 'pendiente') && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)} disabled={deleting === p.id} title="Eliminar">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════ NEW PAYABLE DIALOG ═══════════ */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva Cuenta por Pagar</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Proveedor</Label>
              <Select value={newForm.supplierId} onChange={(e: any) => setNewForm({ ...newForm, supplierId: e.target.value })} className="mt-1">
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.rif ? ` (${s.rif})` : ''}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="text-xs">Descripción *</Label>
              <Input className="mt-1" value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} placeholder="Ej: Compra de mercancía" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Total USD *</Label>
                <Input type="number" min="0" step="0.01" className="mt-1" value={newForm.totalUsd} onChange={(e) => setNewForm({ ...newForm, totalUsd: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs">Tasa de Cambio</Label>
                <Input type="number" min="0" step="0.01" className="mt-1" value={newForm.exchangeRate} onChange={(e) => setNewForm({ ...newForm, exchangeRate: e.target.value })} />
              </div>
            </div>
            {parseFloat(newForm.totalUsd) > 0 && parseFloat(newForm.exchangeRate) > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                Equivalente en Bs: <strong>{fmtBs(parseFloat(newForm.totalUsd) * parseFloat(newForm.exchangeRate))}</strong>
              </div>
            )}
            <div>
              <Label className="text-xs">Fecha de Vencimiento</Label>
              <Input type="date" className="mt-1" value={newForm.dueDate} onChange={(e) => setNewForm({ ...newForm, dueDate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Input className="mt-1" value={newForm.notes} onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })} placeholder="Notas opcionales" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleCreate} disabled={saving || !newForm.description.trim() || !parseFloat(newForm.totalUsd)}>
                {saving ? 'Creando...' : 'Crear Cuenta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ DETAIL DIALOG ═══════════ */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalle de Cuenta por Pagar
              {selectedPayable && (
                <Badge variant="outline" className={`text-[10px] ${STATUS_CONFIG[selectedPayable.status]?.color || ''}`}>
                  <span className="flex items-center gap-1">{STATUS_CONFIG[selectedPayable.status]?.icon} {STATUS_CONFIG[selectedPayable.status]?.label}</span>
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : selectedPayable ? (
            <div className="space-y-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{selectedPayable.supplier?.name || '—'}</p>
                  {selectedPayable.supplier?.rif && <p className="text-xs text-muted-foreground">{selectedPayable.supplier.rif}</p>}
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Descripción</p>
                  <p className="font-medium">{selectedPayable.description}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold text-lg">{fmtUsd(selectedPayable.totalUsd)}</p>
                  <p className="text-xs text-muted-foreground">{fmtBs(selectedPayable.totalBs)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Pagado</p>
                  <p className="font-bold text-lg text-green-700">{fmtUsd(selectedPayable.paidUsd)}</p>
                  <p className="text-xs text-muted-foreground">{fmtBs(selectedPayable.paidBs)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Restante</p>
                  <p className={`font-bold text-lg ${selectedPayable.remainingUsd > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {fmtUsd(selectedPayable.remainingUsd)}
                  </p>
                  <p className="text-xs text-muted-foreground">{fmtBs(selectedPayable.remainingBs)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Vencimiento</p>
                  <p className={`font-medium ${selectedPayable.dueDate && new Date(selectedPayable.dueDate) < new Date() && selectedPayable.status !== 'pagada' ? 'text-red-600 font-bold' : ''}`}>
                    {fmtDate(selectedPayable.dueDate)}
                  </p>
                  {selectedPayable.dueDate && new Date(selectedPayable.dueDate) < new Date() && selectedPayable.status !== 'pagada' && (
                    <p className="text-[10px] text-red-600">VENCIDA</p>
                  )}
                </div>
              </div>

              {selectedPayable.notes && (
                <div className="text-xs bg-muted/30 rounded p-2">
                  <span className="text-muted-foreground">Notas: </span>{selectedPayable.notes}
                </div>
              )}

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso de pago</span>
                  <span>{selectedPayable.totalUsd > 0 ? Math.round((selectedPayable.paidUsd / selectedPayable.totalUsd) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${selectedPayable.totalUsd > 0 ? Math.min(100, (selectedPayable.paidUsd / selectedPayable.totalUsd) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Pay button */}
              {selectedPayable.status !== 'pagada' && (
                <Button className="w-full" onClick={openPayDialog}>
                  <DollarSign className="w-4 h-4 mr-2" /> Registrar Pago
                </Button>
              )}

              {/* Payments History */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4" />
                  Historial de Pagos ({selectedPayable.payments.length})
                </h4>
                {selectedPayable.payments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No hay pagos registrados</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedPayable.payments.map((pay) => (
                      <div key={pay.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-green-700">{fmtUsd(pay.amountUsd)}</span>
                            <span className="text-muted-foreground">({fmtBs(pay.amountBs)})</span>
                          </div>
                          <p className="text-muted-foreground mt-0.5">
                            {pay.method} {pay.reference ? `· Ref: ${pay.reference}` : ''}
                          </p>
                          {pay.notes && <p className="text-muted-foreground italic">{pay.notes}</p>}
                          {pay.createdBy && <p className="text-muted-foreground">Por: {pay.createdBy}</p>}
                        </div>
                        <div className="text-right text-muted-foreground flex-shrink-0">
                          <p>{fmtDate(pay.date)}</p>
                          <p>Tasa: {pay.exchangeRate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ═══════════ PAYMENT DIALOG ═══════════ */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Pago</DialogTitle></DialogHeader>
          {selectedPayable && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-xs">
                <p className="text-muted-foreground">Cuenta: <span className="font-medium text-foreground">{selectedPayable.description}</span></p>
                <p className="text-muted-foreground mt-1">
                  Restante: <span className="font-bold text-red-700">{fmtUsd(selectedPayable.remainingUsd)}</span>
                </p>
              </div>

              <div>
                <Label className="text-xs">Monto USD *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="mt-1"
                  value={payForm.amountUsd}
                  onChange={(e) => setPayForm({ ...payForm, amountUsd: e.target.value })}
                  placeholder="0.00"
                />
                {parseFloat(payForm.amountUsd) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Equivale a: {fmtBs(parseFloat(payForm.amountUsd) * (parseFloat(payForm.exchangeRate) || bcvRate))}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs">Tasa de Cambio</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1"
                  value={payForm.exchangeRate}
                  onChange={(e) => setPayForm({ ...payForm, exchangeRate: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs">Método de Pago</Label>
                <Select value={payForm.method} onChange={(e: any) => setPayForm({ ...payForm, method: e.target.value, reference: ['transferencia', 'pago-movil', 'zelle'].includes(e.target.value) ? payForm.reference : '' })} className="mt-1">
                  {PAY_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </Select>
              </div>

              {showPayRefField && (
                <div>
                  <Label className="text-xs">Número de Referencia *</Label>
                  <Input className="mt-1" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="Ej: 1234567890" />
                </div>
              )}

              <div>
                <Label className="text-xs">Notas</Label>
                <Input className="mt-1" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} placeholder="Notas opcionales" />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowPayDialog(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handlePay} disabled={saving || !parseFloat(payForm.amountUsd) || (showPayRefField && !payForm.reference.trim())}>
                  {saving ? 'Registrando...' : 'Registrar Pago'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
