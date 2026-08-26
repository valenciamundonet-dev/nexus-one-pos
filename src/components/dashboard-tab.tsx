"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authFetch } from "@/lib/auth-fetch";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import {
  CreditCard, Package, Users, ShoppingCart, TrendingUp as ChartIcon,
  Settings, Zap, BoxesIcon, ClipboardList, Truck, Receipt,
  BookOpen, BarChart3, Wallet, Pause, CircleDollarSign, KeyRound, UserCircle, Database,
  Store, RefreshCcw as ReloadIcon
} from 'lucide-react';

interface DashboardProps {
  bcvRate: number;
  currency: string;
  onNavigate?: (tab: string) => void;
  availableTabs?: string[];
}

interface DashboardData {
  today: {
    grossUsd: number;
    grossBs: number;
    totalUsd: number;
    totalBs: number;
    count: number;
    avgTicket: number;
    creditCount: number;
    creditUsd: number;
    casheaCount: number;
    casheaUsd: number;
    casheaBs: number;
  };
  yesterday: { totalUsd: number; count: number };
  pctChange: number;
  weekDays: { label: string; total: number; count: number; cashea: number; casheaCount: number }[];
  topProducts: { name: string; qty: number; total: number }[];
  paymentBreakdown: Record<string, { count: number; totalUsd: number; totalBs: number }>;
  recentSales: {
    id: string; time: string; customer: string;
    total: number; totalBs: number; method: string;
    isCredit: boolean; isCashea?: boolean; itemCount: number;
  }[];
  lastUpdate: string;
}

const METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  'efectivo-usd': "Efectivo $",
  cashea: "Cashea",
  transferencia: "Transferencia",
  'pago-movil': "Pago Movil",
  'punto-de-venta': "Punto de Venta",
  zelle: "Zelle",
  usdt: "USDT",
  credito: "Credito",
  mixto: "Mixto",
};

// ── Module tiles config ──
const MODULE_TILES = [
  {
    id: 'ventas',
    title: 'PUNTO DE VENTA',
    subtitle: 'Ventas, Caja, Presupuestos y Entregas',
    icon: CreditCard,
    gradient: 'from-blue-500 to-blue-600',
    darkGradient: 'from-blue-600 to-blue-700',
    iconColor: 'text-blue-100',
    tabs: ['pos', 'cash-closing', 'held-sales', 'quotes', 'delivery-notes'],
    statLabel: 'Ventas Hoy',
    statKey: 'count' as const,
  },
  {
    id: 'inventario',
    title: 'INVENTARIO',
    subtitle: 'Productos, Categorias, Kardex y Catalogo',
    icon: Package,
    gradient: 'from-teal-500 to-emerald-600',
    darkGradient: 'from-teal-600 to-emerald-700',
    iconColor: 'text-teal-100',
    tabs: ['products', 'kardex', 'catalog'],
    statLabel: null,
    statKey: null,
  },
  {
    id: 'personas',
    title: 'PERSONAS',
    subtitle: 'Clientes, Proveedores y Cuentas por Cobrar',
    icon: Users,
    gradient: 'from-amber-500 to-orange-500',
    darkGradient: 'from-amber-600 to-orange-600',
    iconColor: 'text-amber-100',
    tabs: ['clients', 'suppliers', 'credit'],
    statLabel: null,
    statKey: null,
  },
  {
    id: 'operaciones',
    title: 'OPERACIONES',
    subtitle: 'Compras, Devoluciones y Gastos',
    icon: ShoppingCart,
    gradient: 'from-rose-500 to-pink-600',
    darkGradient: 'from-rose-600 to-pink-700',
    iconColor: 'text-rose-100',
    tabs: ['purchases', 'devolutions', 'expenses'],
    statLabel: null,
    statKey: null,
  },
  {
    id: 'informes',
    title: 'INFORMES',
    subtitle: 'Estadisticas, Ventas y Rendimiento',
    icon: BarChart3,
    gradient: 'from-violet-500 to-purple-600',
    darkGradient: 'from-violet-600 to-purple-700',
    iconColor: 'text-violet-100',
    tabs: ['reports'],
    statLabel: 'Ventas Brutas',
    statKey: 'grossUsd' as const,
  },
  {
    id: 'sistema',
    title: 'SISTEMA',
    subtitle: 'Configuracion, Usuarios, Licencia y Respaldos',
    icon: Settings,
    gradient: 'from-slate-600 to-slate-700',
    darkGradient: 'from-slate-700 to-slate-800',
    iconColor: 'text-slate-300',
    tabs: ['config', 'users', 'license', 'backup'],
    statLabel: null,
    statKey: null,
  },
];

export default function DashboardTab({ bcvRate, currency, onNavigate, availableTabs }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await authFetch("/api/dashboard");
      const json = await res.json();
      if (!json.error) setData(json);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    const interval = setInterval(loadDashboard, 60000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const canNavigate = (tab: string) => {
    if (!availableTabs) return true;
    return availableTabs.includes(tab);
  };

  const getStatValue = (tile: typeof MODULE_TILES[0]) => {
    if (!data || !tile.statKey) return null;
    const val = data.today[tile.statKey];
    if (tile.statKey === 'grossUsd') return `$${val.toFixed(2)}`;
    return String(val);
  };

  const handleTileClick = (tile: typeof MODULE_TILES[0]) => {
    if (!onNavigate) return;
    const accessibleTab = tile.tabs.find(t => canNavigate(t));
    if (accessibleTab) onNavigate(accessibleTab);
  };

  // Filter tiles to only show those with at least one accessible tab
  const visibleTiles = MODULE_TILES.filter(tile =>
    tile.tabs.some(t => canNavigate(t))
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ===== MODULE GRID ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleTiles.map((tile) => {
          const Icon = tile.icon;
          const statVal = getStatValue(tile);

          return (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile)}
              className="group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] dark:shadow-black/20"
              style={{ minHeight: '140px' }}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tile.gradient} dark:${tile.darkGradient} transition-all duration-300`} />

              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-[0.07]" style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                backgroundSize: '20px 20px'
              }} />

              {/* Decorative circle */}
              <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-125" />
              <div className="absolute -right-2 -top-2 w-16 h-16 rounded-full bg-white/5" />

              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm mb-3 shadow-lg transition-transform duration-200 group-hover:scale-110`}>{Icon && <Icon className={`w-6 h-6 ${tile.iconColor}`} />}</div>

                {/* Title */}
                <h3 className="text-sm font-bold text-white tracking-wide leading-tight">{tile.title}</h3>
                <p className="text-[11px] text-white/70 mt-1 leading-relaxed line-clamp-2">{tile.subtitle}</p>

                {/* Stat */}
                {statVal && data && (
                  <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-1">
                    <span className="text-[10px] text-white/70 uppercase tracking-wider">{tile.statLabel}</span>
                    <span className="text-sm font-extrabold text-white">{statVal}</span>
                  </div>
                )}

                {/* Sub-items count */}
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  {tile.tabs.filter(t => canNavigate(t)).map((t) => (
                    <span key={t} className="text-[9px] font-medium text-white/50 bg-white/10 rounded-md px-1.5 py-0.5">
                      {t === 'pos' ? 'POS' : t === 'cash-closing' ? 'Caja' : t === 'held-sales' ? 'Espera' : t === 'quotes' ? 'Presup.' : t === 'delivery-notes' ? 'Entregas' : t === 'products' ? 'Productos' : t === 'kardex' ? 'Kardex' : t === 'catalog' ? 'Catalogo' : t === 'clients' ? 'Clientes' : t === 'suppliers' ? 'Proveed.' : t === 'credit' ? 'CxC' : t === 'purchases' ? 'Compras' : t === 'devolutions' ? 'Devol.' : t === 'expenses' ? 'Gastos' : t === 'reports' ? 'Informes' : t === 'config' ? 'Config' : t === 'users' ? 'Usuarios' : t === 'license' ? 'Licencia' : t === 'backup' ? 'Respaldo' : t}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== KPIs + Charts section (collapsible) ===== */}
      {data && (
        <>
          {/* Quick stats bar */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
            <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-4 py-2.5 shadow-sm flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">${data.today.count}</span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ventas Hoy</p>
                <div className="flex items-center gap-1">
                  {data.pctChange >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                  <span className={`text-xs font-bold ${data.pctChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{data.pctChange >= 0 ? '+' : ''}{data.pctChange.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-4 py-2.5 shadow-sm flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-[10px] font-bold">$</span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Bruto</p>
                <p className="text-xs font-bold">${data.today.grossUsd.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-4 py-2.5 shadow-sm flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-[10px] font-bold">$</span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Neto (Caja)</p>
                <p className="text-xs font-bold">${data.today.totalUsd.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border/50 rounded-xl px-4 py-2.5 shadow-sm flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
                <span className="text-purple-600 dark:text-purple-400 text-[10px] font-bold">BNPL</span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cashea</p>
                <p className="text-xs font-bold">${data.today.casheaUsd.toFixed(2)}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadDashboard} className="h-9 gap-1.5 text-xs flex-shrink-0 ml-auto">
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </Button>
          </div>

          {/* Cashea info */}
          {data.today.casheaCount > 0 && (
            <div className="border border-purple-200/60 dark:border-purple-800/30 bg-purple-50/60 dark:bg-purple-950/15 rounded-xl p-3 text-xs text-purple-800 dark:text-purple-300 flex items-start gap-2.5">
              <span className="text-base flex-shrink-0 mt-0.5">&#128241;</span>
              <div>
                <strong>Cashea (Compra Ahora, Paga Despues):</strong> {data.today.casheaCount} venta(s) por ${data.today.casheaUsd.toFixed(2)} / Bs {data.today.casheaBs.toFixed(2)}.
                Este dinero NO entra a caja hoy porque Cashea lo transfiere despues desde la app.
              </div>
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-3 card-shadow">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Ventas de la Semana (USD)</CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">Verde = Entradas Netas | Morado = Cashea (BNPL)</p>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.weekDays.map(d => ({ label: d.label, netas: parseFloat(d.total.toFixed(2)), cashea: parseFloat(d.cashea.toFixed(2)) }))} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === 'cashea' ? 'Cashea (BNPL)' : 'Entradas Netas']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => value === 'cashea' ? 'Cashea (BNPL)' : 'Entradas Netas'} />
                      <Bar dataKey="netas" stackId="a" name="netas" fill="#22c55e" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="cashea" stackId="a" name="cashea" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top productos */}
            <Card className="lg:col-span-2 card-shadow">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Mas Vendidos Hoy</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {data.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin ventas hoy</p>
                ) : (
                  <div className="space-y-1">
                    {data.topProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[11px] font-bold text-muted-foreground/60 w-5 text-right">#{i + 1}</span>
                          <span className="text-sm font-medium truncate">{p.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold">${p.total.toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">{p.qty} uds</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Metodos de pago + Ultimas ventas */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-2 card-shadow">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Metodos de Pago Hoy</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {Object.keys(data.paymentBreakdown).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin ventas hoy</p>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(data.paymentBreakdown).sort((a, b) => b[1].totalUsd - a[1].totalUsd).map(([method, info]) => (
                      <div key={method} className={`flex items-center justify-between py-2 border-b border-border/30 last:border-0 ${method === 'cashea' ? 'bg-purple-50/50 dark:bg-purple-950/10 -mx-2 px-2 rounded-lg' : ''}`}>
                        <span className="text-sm flex items-center gap-1.5">
                          {method === 'cashea' && <span className="text-xs">&#128241;</span>}
                          {METHOD_LABELS[method] || method}
                          {method === 'cashea' && <Badge variant="outline" className="text-[8px] text-purple-700 border-purple-300 dark:text-purple-400 dark:border-purple-700">BNPL</Badge>}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-bold">${info.totalUsd.toFixed(2)}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">({info.count})</span>
                        </div>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between py-1">
                      <span className="text-sm font-bold">TOTAL BRUTO</span>
                      <span className="text-sm font-extrabold">${data.today.grossUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground py-0.5">
                      <span>Entradas Netas</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">${data.today.totalUsd.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ultimas ventas */}
            <Card className="lg:col-span-3 card-shadow">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Ultimas Ventas de Hoy</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {data.recentSales.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin ventas hoy</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hora</th>
                          <th className="text-left py-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                          <th className="text-right py-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total $</th>
                          <th className="text-right py-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Bs</th>
                          <th className="text-center py-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Metodo</th>
                          <th className="text-center py-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Items</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentSales.map((sale) => (
                          <tr key={sale.id} className={`border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors ${sale.isCredit ? 'bg-amber-50/40 dark:bg-amber-950/10' : sale.isCashea ? 'bg-purple-50/40 dark:bg-purple-950/10' : ''}`}>
                            <td className="py-2 px-1 font-mono text-muted-foreground">{sale.time}</td>
                            <td className="py-2 px-1 truncate max-w-[120px]">{sale.customer}</td>
                            <td className="py-2 px-1 text-right font-bold">${sale.total.toFixed(2)}</td>
                            <td className="py-2 px-1 text-right">{sale.totalBs.toFixed(2)}</td>
                            <td className="py-2 px-1 text-center">
                              {sale.isCredit ? (
                                <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">CREDITO</Badge>
                              ) : sale.isCashea ? (
                                <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800">CASHEA</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[9px]">{METHOD_LABELS[sale.method] || sale.method}</Badge>
                              )}
                            </td>
                            <td className="py-2 px-1 text-center text-muted-foreground">{sale.itemCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
