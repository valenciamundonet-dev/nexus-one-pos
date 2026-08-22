"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CartItem, ClientData, MixedEntry, Product } from "../types";
import { CartItemRow } from "./cart-item";
import { PaymentSection } from "./payment-section";
import { ShortcutsBar } from "../shortcuts-bar";

interface CartPanelProps {
  // Cart data
  cart: CartItem[];
  products: Product[];
  currency: string;
  allowZeroStock: boolean;
  onClearCart: () => void;
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onToggleWholesale: (id: string) => void;
  isGranMayorMode: boolean;
  onToggleGranMayor: () => void;

  // Client
  selectedClient: ClientData | null;
  onOpenClientDialog: () => void;

  // QR
  onOpenQrModal: () => void;

  // Payment (passed through to PaymentSection)
  paymentMethod: string;
  setPaymentMethod: (m: string) => void;
  referenceNumber: string;
  setReferenceNumber: (v: string) => void;
  cashReceived: string;
  setCashReceived: (v: string) => void;
  cashReceivedUsd: string;
  setCashReceivedUsd: (v: string) => void;
  isCredit: boolean;
  setIsCredit: (v: boolean) => void;
  creditClientId: string;
  setCreditClientId: (v: string) => void;
  creditClientName: string;
  creditClientDebt: number;
  creditDays: number;
  setCreditDays: (v: number) => void;
  clients: ClientData[];
  mixedPayments: MixedEntry[];
  updateMixedEntry: (i: number, f: keyof MixedEntry, v: string | number) => void;
  addMixedEntry: () => void;
  removeMixedEntry: (i: number) => void;
  isMixedValid: boolean;
  mixedTotalBs: number;
  mixedRemaining: number;
  mixedRemainingUsd: number;
  enableDiscount: boolean;
  discount: number | string;
  setDiscount: (v: number) => void;
  maxDiscountPct: number;
  subtotal: number;
  canSaleNotes: boolean;
  notes: string;
  setNotes: (v: string) => void;
  bcvRate: number;
  total: number;
  totalBs: number;
  taxAmount: number;
  taxRate: number;
  taxMode?: string;
  effectiveDiscount: number;
  isUsdMethod: boolean;
  vuelto: number;
  vueltoUsd: number;
  cashInputRef: React.RefObject<HTMLInputElement | null>;
  cashUsdInputRef: React.RefObject<HTMLInputElement | null>;
  onCompleteSale: () => void;

  // Shortcuts callbacks (for touch/click on mobile)
  onSearchFocus?: () => void;
  onToggleCredit?: () => void;
  onSetCashUsd?: () => void;
  onSetCashBs?: () => void;
  onSetPagoMovil?: () => void;
  onCharge?: () => void;
  onHoldSale?: () => void;
}

export const CartPanel = React.memo(function CartPanel({
  cart, products, currency, allowZeroStock,
  onClearCart, onUpdateQty, onRemove, onToggleWholesale,
  isGranMayorMode, onToggleGranMayor,
  selectedClient, onOpenClientDialog, onOpenQrModal,
  paymentMethod, setPaymentMethod, referenceNumber, setReferenceNumber,
  cashReceived, setCashReceived, cashReceivedUsd, setCashReceivedUsd,
  isCredit, setIsCredit, creditClientId, setCreditClientId,
  creditClientName, creditClientDebt, creditDays, setCreditDays, clients,
  mixedPayments, updateMixedEntry, addMixedEntry, removeMixedEntry,
  isMixedValid, mixedTotalBs, mixedRemaining, mixedRemainingUsd,
  enableDiscount, discount, setDiscount, maxDiscountPct, subtotal,
  canSaleNotes, notes, setNotes, bcvRate,
  total, totalBs, taxAmount, taxRate, taxMode, effectiveDiscount,
  isUsdMethod, vuelto, vueltoUsd,
  cashInputRef, cashUsdInputRef, onCompleteSale,
  onSearchFocus, onToggleCredit, onSetCashUsd, onSetCashBs, onSetPagoMovil, onCharge, onHoldSale,
}: CartPanelProps) {
  return (
    <Card className="md:col-span-3 flex flex-col h-full border-2 border-primary/30 shadow-lg overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4 relative">
        {/* Shopping cart background image */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none select-none" style={{ backgroundImage: 'url(/cart-bg.svg)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center' }} />
        <div className="flex items-center justify-between mb-2 relative z-10">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Carrito <span className="text-primary">({cart.length})</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <button onClick={onToggleGranMayor} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[10px] border transition-all ${
              isGranMayorMode
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            }`} title={isGranMayorMode ? "Desactivar Gran Mayor" : "Activar Gran Mayor (precio tasa Euro/USDT)"}>
              GM
            </button>
            <button onClick={onOpenQrModal} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px] border border-indigo-200 hover:bg-indigo-200 transition-colors" title="Acceso movil via QR">
              Telefono QR
            </button>
            {cart.length > 0 && (
              <Button variant="destructive" size="sm" onClick={onClearCart} className="text-xs h-7">Vaciar</Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden px-4 pb-4">
        {/* Keyboard shortcuts bar */}
        <ShortcutsBar
          onSearch={onSearchFocus}
          onToggleCredit={onToggleCredit}
          onCashUsd={onSetCashUsd}
          onCashBs={onSetCashBs}
          onPagoMovil={onSetPagoMovil}
          onCharge={onCharge}
          onHoldSale={onHoldSale}
          onClear={cart.length > 0 ? () => onClearCart() : undefined}
        />

        {/* Selected client */}
        <div className="p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">CLIENTE</p>
              <p className="text-lg font-semibold truncate">
                {selectedClient ? selectedClient.fullName : "Sin cliente"}
                {selectedClient && <span className="text-muted-foreground ml-2 text-sm">({selectedClient.docType}-{selectedClient.docNumber})</span>}
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-9 text-sm font-medium px-4" onClick={onOpenClientDialog}>
              Cambiar
            </Button>
          </div>
        </div>

        {/* Cart items */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
          {cart.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              product={products.find((p) => p.id === item.id)}
              currency={currency}
              allowZeroStock={allowZeroStock}
              onUpdateQty={onUpdateQty}
              onRemove={onRemove}
              onToggleWholesale={onToggleWholesale}
            />
          ))}
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center relative">
              {/* Cart illustration as background */}
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none select-none" style={{ backgroundImage: 'url(/cart-bg.svg)', backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-primary/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                  <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-[10px] font-bold text-primary">0</span>
                  </div>
                </div>
                <p className="text-lg font-semibold text-muted-foreground/70">Agregue productos al carrito</p>
                <p className="text-xs text-muted-foreground/50 max-w-[200px]">Busque productos por nombre, codigo o escanee el codigo de barras</p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <PaymentSection
          paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
          referenceNumber={referenceNumber} setReferenceNumber={setReferenceNumber}
          cashReceived={cashReceived} setCashReceived={setCashReceived}
          cashReceivedUsd={cashReceivedUsd} setCashReceivedUsd={setCashReceivedUsd}
          isCredit={isCredit} setIsCredit={setIsCredit}
          creditClientId={creditClientId} setCreditClientId={setCreditClientId}
          creditClientName={creditClientName} creditClientDebt={creditClientDebt}
          creditDays={creditDays} setCreditDays={setCreditDays} clients={clients}
          mixedPayments={mixedPayments} updateMixedEntry={updateMixedEntry}
          addMixedEntry={addMixedEntry} removeMixedEntry={removeMixedEntry}
          isMixedValid={isMixedValid} mixedTotalBs={mixedTotalBs}
          mixedRemaining={mixedRemaining} mixedRemainingUsd={mixedRemainingUsd}
          enableDiscount={enableDiscount} discount={discount} setDiscount={setDiscount}
          maxDiscountPct={maxDiscountPct} subtotal={subtotal}
          canSaleNotes={canSaleNotes} notes={notes} setNotes={setNotes}
          bcvRate={bcvRate} total={total} totalBs={totalBs}
          taxAmount={taxAmount} taxRate={taxRate} taxMode={taxMode}
          effectiveDiscount={effectiveDiscount} isUsdMethod={isUsdMethod}
          vuelto={vuelto} vueltoUsd={vueltoUsd} currency={currency}
          cashInputRef={cashInputRef} cashUsdInputRef={cashUsdInputRef}
          onCompleteSale={onCompleteSale} cartLength={cart.length}
        />
      </CardContent>
    </Card>
  );
});
