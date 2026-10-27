"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { type AppliedBundle, applyBundles, type BundleClaim } from "@/lib/bundle-math";
import { CART_BUNDLES_KEY, CART_KEY } from "@/lib/site";
import type { CardProduct } from "@/lib/types";

export type CartLine = CardProduct & { qty: number };

type CartContext = {
  lines: CartLine[];
  /** False until the cart has been read from localStorage (avoids showing "empty" for a moment). */
  ready: boolean;
  count: number;
  subtotal: number;
  /** Bundles whose products are all in the cart, with their discount. */
  bundles: AppliedBundle[];
  discount: number;
  /** Subtotal minus bundle discounts: what the goods cost. */
  total: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Adds `qty` (capped at stock). Returns the quantity actually in the cart afterwards. */
  add: (product: CardProduct, qty?: number) => number;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  /** Adds one of each product and remembers them as a set, so the set's discount applies. */
  addBundle: (products: CardProduct[], discount: number) => void;
  clear: () => void;
  /** Increments every time something is added, so the cart badge can play its bump. */
  addedTick: number;
};

const Ctx = createContext<CartContext | null>(null);

export const MAX_PER_LINE = 20;

function readBundles(): BundleClaim[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_BUNDLES_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (b) => b && Array.isArray(b.skus) && b.skus.length >= 2 && b.skus.every((s: unknown) => typeof s === "string") && Number.isFinite(b.discount),
    );
  } catch {
    return [];
  }
}

function read(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (l) => l && typeof l.sku === "string" && Number.isFinite(l.qty) && l.qty > 0 && typeof l.name?.bg === "string" && typeof l.name?.en === "string",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [addedTick, setAddedTick] = useState(0);
  const [claims, setClaims] = useState<BundleClaim[]>([]);
  // Every change goes through commit(), so linesRef is always current, even between two quick clicks.
  const linesRef = useRef<CartLine[]>([]);
  const commit = useCallback((update: (current: CartLine[]) => CartLine[]) => {
    linesRef.current = update(linesRef.current);
    setLines(linesRef.current);
  }, []);

  // Load once, then refresh prices and stock from the current catalog (an import may have changed them).
  useEffect(() => {
    const stored = read();
    commit(() => stored);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    setClaims(readBundles());
    if (!stored.length) return;
    const skus = stored.map((l) => l.sku).join(",");
    fetch(`/api/cart?skus=${encodeURIComponent(skus)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { products: CardProduct[] } | null) => {
        if (!data) return;
        const fresh = new Map(data.products.map((p) => [p.sku, p]));
        commit((current) =>
          current
            .filter((l) => fresh.has(l.sku))
            .map((l) => {
              const p = fresh.get(l.sku)!;
              return { ...p, qty: Math.min(l.qty, Math.max(p.stock, 0)) };
            })
            .filter((l) => l.qty > 0),
        );
      })
      .catch(() => {});
  }, [commit]);

  // Persist, and follow changes made in other tabs.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      // Storage full or blocked: the cart still works for this visit.
    }
  }, [lines, ready]);

  // A set whose product was removed no longer counts, also when the product is added again on its own.
  const liveClaims = useMemo(() => claims.filter((c) => c.skus.every((sku) => lines.some((l) => l.sku === sku))), [claims, lines]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CART_BUNDLES_KEY, JSON.stringify(liveClaims));
    } catch {
      // As above.
    }
  }, [liveClaims, ready]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) commit(() => read());
      if (e.key === CART_BUNDLES_KEY) setClaims(readBundles());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [commit]);

  const add = useCallback((product: CardProduct, qty = 1) => {
    const limit = Math.min(MAX_PER_LINE, product.stock);
    const existing = linesRef.current.find((l) => l.sku === product.sku);
    const next = Math.min(limit, (existing?.qty ?? 0) + qty);
    if (next <= 0) return 0;
    commit((current) =>
      existing
        ? current.map((l) => (l.sku === product.sku ? { ...product, qty: next } : l))
        : [...current, { ...product, qty: next }],
    );
    setAddedTick((t) => t + 1);
    return next;
  }, [commit]);

  const setQty = useCallback((sku: string, qty: number) => {
    commit((current) =>
      current
        .map((l) => (l.sku === sku ? { ...l, qty: Math.max(0, Math.min(qty, Math.min(MAX_PER_LINE, l.stock))) } : l))
        .filter((l) => l.qty > 0),
    );
    if (qty <= 0) setClaims((current) => current.filter((c) => !c.skus.includes(sku)));
  }, [commit]);

  const remove = useCallback((sku: string) => {
    commit((current) => current.filter((l) => l.sku !== sku));
    setClaims((current) => current.filter((c) => !c.skus.includes(sku)));
  }, [commit]);
  const clear = useCallback(() => {
    commit(() => []);
    setClaims([]);
  }, [commit]);

  const addBundle = useCallback((products: CardProduct[], discount: number) => {
    for (const p of products) add(p, 1);
    const skus = products.map((p) => p.sku);
    const key = skus.join("+");
    setClaims((current) => (current.some((c) => c.skus.join("+") === key) ? current : [...current, { skus, discount }]));
  }, [add]);

  const value = useMemo<CartContext>(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = Math.round(lines.reduce((s, l) => s + l.qty * l.price, 0) * 100) / 100;
    const { applied, discount } = applyBundles(lines, liveClaims);
    const total = Math.round((subtotal - discount) * 100) / 100;
    return { lines, ready, count, subtotal, bundles: applied, discount, total, open, setOpen, add, setQty, remove, addBundle, clear, addedTick };
  }, [lines, liveClaims, ready, open, add, setQty, remove, addBundle, clear, addedTick]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
