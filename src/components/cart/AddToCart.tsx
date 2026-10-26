"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import type { CardProduct } from "@/lib/types";
import { IconBag, IconCheck, IconMinus, IconPlus } from "../Icons";
import { MAX_PER_LINE, useCart } from "./CartProvider";

/** The big button on the product page, with a quantity stepper. Opens the cart drawer. */
export function AddToCart({ product }: { product: CardProduct }) {
  const { add, lines, setOpen } = useCart();
  const t = useT().cart;
  const locale = useLocale();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<number>(undefined);
  const inCart = lines.find((l) => l.sku === product.sku)?.qty ?? 0;
  const limit = Math.max(0, Math.min(MAX_PER_LINE, product.stock) - inCart);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (product.stock <= 0) {
    return (
      <button type="button" className="btn btn-wine w-full" disabled>
        {t.outOfStock}
      </button>
    );
  }

  const onAdd = () => {
    if (!limit) {
      setOpen(true);
      return;
    }
    add(product, Math.min(qty, limit));
    setQty(1);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1800);
    setOpen(true);
  };

  return (
    <div className="flex gap-3">
      <QtyStepper value={Math.min(qty, Math.max(1, limit))} max={Math.max(1, limit)} onChange={setQty} label={product.name[locale]} disabled={!limit} />
      <button type="button" className="btn btn-wine morph relative flex-1" onClick={onAdd}>
        <span data-hidden={added} className="inline-flex items-center gap-2">
          <IconBag size={18} />
          {limit ? t.add : t.allInCart}
        </span>
        <span data-hidden={!added} className="absolute inset-0 inline-flex items-center justify-center gap-2" aria-hidden={!added}>
          <IconCheck size={18} />
          {t.added}
        </span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {added ? t.addedStatus : ""}
      </span>
    </div>
  );
}

/** Small round button on product cards. Does not open the drawer: the badge bump is the feedback. */
export function QuickAdd({ product }: { product: CardProduct }) {
  const { add, lines } = useCart();
  const t = useT().cart;
  const locale = useLocale();
  const [added, setAdded] = useState(false);
  const timer = useRef<number>(undefined);
  const inCart = lines.find((l) => l.sku === product.sku)?.qty ?? 0;
  const full = inCart >= Math.min(MAX_PER_LINE, product.stock);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (product.stock <= 0) return null;
  const name = product.name[locale];

  return (
    <button
      type="button"
      className="quick-add btn btn-wine morph absolute right-2.5 bottom-2.5 min-h-0 size-11 rounded-full p-0 shadow-[0_6px_18px_-8px_rgb(23_15_18/0.6)]"
      aria-label={full ? t.quickFull(name) : t.quickAdd(name)}
      disabled={full && !added}
      onClick={(e) => {
        e.preventDefault();
        if (add(product, 1) > inCart) {
          setAdded(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setAdded(false), 1400);
        }
      }}
    >
      <span data-hidden={added} className="absolute inset-0 grid place-items-center">
        <IconPlus size={18} />
      </span>
      <span data-hidden={!added} className="absolute inset-0 grid place-items-center">
        <IconCheck size={18} />
      </span>
    </button>
  );
}

export function QtyStepper({
  value,
  max,
  onChange,
  label,
  disabled = false,
  size = "md",
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const t = useT().cart;
  const h = size === "sm" ? "h-9" : "h-12";
  const w = size === "sm" ? "w-8" : "w-11";
  return (
    <div className={`inline-flex ${h} items-center rounded-full border border-line bg-paper`} role="group" aria-label={t.quantity(label)}>
      <button
        type="button"
        className={`grid ${h} ${w} place-items-center rounded-full text-ink-2 transition-colors duration-150 disabled:opacity-30 enabled:hover:text-ink`}
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        aria-label={t.decrease}
      >
        <IconMinus size={16} />
      </button>
      <span className="tabular w-6 text-center text-sm font-semibold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={`grid ${h} ${w} place-items-center rounded-full text-ink-2 transition-colors duration-150 disabled:opacity-30 enabled:hover:text-ink`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label={t.increase}
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}
