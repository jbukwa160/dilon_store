"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { paths } from "@/i18n/paths";
import { count as fmtCount, price } from "@/lib/format";
import { SHIPPING } from "@/lib/site";
import { IconBag, IconClose, IconTrash } from "../Icons";
import { useDialog } from "../useDialog";
import { QtyStepper } from "./AddToCart";
import { MAX_PER_LINE, useCart } from "./CartProvider";

export function CartButton() {
  const { count, ready, setOpen, addedTick } = useCart();
  const t = useT().cart;
  return (
    <button type="button" className="icon-btn relative" onClick={() => setOpen(true)} aria-label={t.open(count)}>
      <IconBag size={22} />
      {ready && count > 0 && (
        <span
          key={addedTick}
          className={`tabular absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-wine px-1 text-[0.6875rem] font-semibold text-white ${addedTick ? "bump" : ""}`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

export function FreeShippingMeter({ subtotal }: { subtotal: number }) {
  const t = useT().cart;
  const locale = useLocale();
  const left = Math.max(0, SHIPPING.freeFrom - subtotal);
  const ratio = Math.min(1, subtotal / SHIPPING.freeFrom);
  return (
    <div>
      <p className="text-sm text-ink-2">
        {left > 0 ? (
          <>
            {t.more ? `${t.more} ` : ""}
            <strong className="tabular text-ink">{price(left, locale)}</strong> {t.leftForFree}
          </>
        ) : (
          <strong className="text-moss">{t.freeReached}</strong>
        )}
      </p>
      <div className="meter mt-2 h-1 overflow-hidden rounded-full bg-sand-2" aria-hidden="true">
        <span className={left > 0 ? "bg-wine" : "bg-moss"} style={{ transform: `scaleX(${ratio})` }} />
      </div>
    </div>
  );
}

export function CartDrawer() {
  const { lines, open, setOpen, subtotal, setQty, remove, count } = useCart();
  const t = useT().cart;
  const locale = useLocale();
  const P = paths(locale);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(open, () => setOpen(false), panelRef);

  // Close when the page changes (e.g. after clicking a product in the drawer).
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <>
      <div className="backdrop" data-open={open} onClick={() => setOpen(false)} aria-hidden="true" />
      <div ref={panelRef} className="drawer drawer-right" data-open={open} role="dialog" aria-modal="true" aria-label={t.title} aria-hidden={!open} inert={!open}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-display text-2xl font-semibold">
            {t.title} <span className="tabular text-base font-normal text-muted">({fmtCount(count, locale)})</span>
          </p>
          <button type="button" className="icon-btn -mr-2" onClick={() => setOpen(false)} aria-label={t.close}>
            <IconClose />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-sand text-wine">
              <IconBag size={26} />
            </span>
            <p className="mt-5 font-display text-2xl font-semibold">{t.empty}</p>
            <p className="mt-2 text-sm text-muted">{t.emptyText}</p>
            <Link href={P.category("vibrators")} className="btn btn-line mt-6">
              {t.emptyCta}
            </Link>
          </div>
        ) : (
          <>
            <div className="border-b border-line px-5 py-4">
              <FreeShippingMeter subtotal={subtotal} />
            </div>
            <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5">
              {lines.map((l) => {
                const name = l.name[locale];
                return (
                  <li key={l.sku} className="flex gap-4 py-4">
                    <Link href={P.product(l.slug)} className="tile relative block size-20 shrink-0" tabIndex={-1} aria-hidden="true">
                      <Image src={l.image} alt="" fill sizes="80px" className="p-2" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Link href={P.product(l.slug)} className="line-clamp-2 text-sm leading-snug font-medium hover:text-wine">
                        {name}
                      </Link>
                      {l.brand && <p className="mt-0.5 text-xs text-muted">{l.brand}</p>}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <QtyStepper size="sm" value={l.qty} max={Math.min(MAX_PER_LINE, l.stock)} onChange={(v) => setQty(l.sku, v)} label={name} />
                        <p className="tabular text-sm font-semibold">{price(l.price * l.qty, locale)}</p>
                      </div>
                    </div>
                    <button type="button" className="icon-btn -mr-2 size-9 self-start text-muted hover:text-wine" onClick={() => remove(l.sku)} aria-label={t.remove(name)}>
                      <IconTrash size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-line bg-bone px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-2">{t.subtotal}</span>
                <span className="tabular text-lg font-semibold">{price(subtotal, locale)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{t.shippingNote}</p>
              <Link href={P.checkout()} className="btn btn-wine mt-4 w-full">
                {t.checkout}
              </Link>
              <button type="button" className="mt-2 w-full py-2 text-sm text-ink-2 hover:text-ink" onClick={() => setOpen(false)}>
                {t.continue}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
