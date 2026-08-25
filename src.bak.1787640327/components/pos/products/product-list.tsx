"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import type { Product } from "../types";

interface ProductListProps {
  products: Product[];
  currency: string;
  bcvRate: number;
  allowZeroStock: boolean;
  onAddToCart: (product: Product) => void;
}

// ─── Fase 3e: Virtualization constants ──
const VIRTUAL_THRESHOLD = 80;
const ROW_HEIGHT = 52;
const OVERSCAN = 5;

function renderRow(product: Product, currency: string, bcvRate: number, allowZeroStock: boolean, onAddToCart: (p: Product) => void) {
  const isOut = product.stock <= 0;
  const isLow = product.stock > 0 && product.stock <= (product.minStock || 5);

  return (
    <button
      key={product.id}
      onClick={() => onAddToCart(product)}
      disabled={!allowZeroStock && isOut}
      className={`flex items-center gap-2 w-full p-2 rounded-lg border transition-all text-left ${
        isOut && !allowZeroStock
          ? "bg-red-50 border-red-300 opacity-50 cursor-not-allowed"
          : isOut && allowZeroStock
          ? "bg-orange-50 border-orange-300"
          : isLow
          ? "bg-yellow-50 border-yellow-300"
          : "bg-card border-muted hover:bg-accent hover:border-primary/40"
      }`}
    >
      {product.icon && <span className="text-base flex-shrink-0">{product.icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{product.name}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-bold text-primary">
          {currency} {product.price.toFixed(2)}{product.vendePorPeso && product.unidadPeso ? `/${product.unidadPeso}` : ""}
        </p>
        <p className="text-[9px] text-muted-foreground">Bs {(product.price * bcvRate).toFixed(0)}</p>
      </div>
      <Badge variant={isOut ? "destructive" : isLow ? "warning" : "secondary"} className="flex-shrink-0 text-[9px] px-1.5 py-0">
        {product.stock}
      </Badge>
    </button>
  );
}

export const ProductList = React.memo(function ProductList({ products, currency, bcvRate, allowZeroStock, onAddToCart }: ProductListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  }, []);

  // Scroll to top when search results change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [products]);

  if (products.length === 0) {
    return <div className="text-center text-muted-foreground py-8 text-sm">No se encontraron productos</div>;
  }

  // For small lists, render all (virtualization overhead not worth it)
  if (products.length < VIRTUAL_THRESHOLD) {
    return (
      <div className="overflow-y-auto max-h-[72vh] p-0.5 space-y-0.5">
        {products.map((p) => renderRow(p, currency, bcvRate, allowZeroStock, onAddToCart))}
      </div>
    );
  }

  // ─── Virtualized rendering ──
  const totalHeight = products.length * ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(72 * (window.innerHeight / 100) / ROW_HEIGHT) + OVERSCAN * 2;
  const endIdx = Math.min(products.length, startIdx + visibleCount);
  const visibleProducts = products.slice(startIdx, endIdx);

  return (
    <div className="overflow-y-auto max-h-[72vh] p-0.5" ref={scrollRef} onScroll={handleScroll}>
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleProducts.map((product) => (
          <div
            key={product.id}
            style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${products.indexOf(product) * ROW_HEIGHT}px)` }}
          >
            {renderRow(product, currency, bcvRate, allowZeroStock, onAddToCart)}
          </div>
        ))}
      </div>
    </div>
  );
});
