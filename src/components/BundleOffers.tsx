"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { paths } from "@/i18n/paths";
import type { BundleRole } from "@/lib/bundles";
import { price } from "@/lib/format";
import type { CardProduct } from "@/lib/types";
import { useCart } from "./cart/CartProvider";
import { IconCheck } from "./Icons";

export type BundleOffer = {
  /** The product first, then its extras. */
  items: CardProduct[];
  roles: BundleRole[];
  discount: number;
  /** All items at their own prices, and what the set saves. */
  price: number;
  saving: number;
};

const percent = (discount: number) => `−${Math.round(discount * 100)}%`;

/**
 * "Buy together" under the add-to-cart button: the product plus extras that are safe to use with it. One card with a
 * "Двойка / Тройка" switch; each smaller set is the start of the bigger one, so the extras the bigger set adds fade out.
 */
export function BundleOffers({ offers }: { offers: BundleOffer[] }) {
  const { addBundle, setOpen } = useCart();
  const t = useT().product.bundles;
  const locale = useLocale();
  const P = paths(locale);
  const [choice, setChoice] = useState(offers.length - 1);
  const [added, setAdded] = useState(false);
  const timer = useRef<number>(undefined);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const offer = offers[choice];
  const all = offers[offers.length - 1];
  const n = offer.items.length;
  const total = Math.round((offer.price - offer.saving) * 100) / 100;

  const choose = (i: number) => {
    setChoice(i);
    setAdded(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (choice + step + offers.length) % offers.length;
    choose(next);
    options.current[next]?.focus();
  };
  const take = () => {
    addBundle(offer.items, offer.discount);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1800);
    setOpen(true);
  };

  return (
    <section className="mt-10" aria-labelledby="bundles">
      <p className="eyebrow text-wine">{t.eyebrow}</p>
      <h2 id="bundles" className="font-display mt-1.5 text-[1.75rem] leading-tight font-semibold">
        {t.title}
      </h2>

      <div className="mt-4 rounded-lg border border-line bg-paper p-4 sm:p-5">
        {offers.length > 1 ? (
          <div
            role="radiogroup"
            aria-labelledby="bundles"
            className="relative grid rounded-full bg-sand p-1 text-sm font-medium"
            style={{ gridTemplateColumns: `repeat(${offers.length}, minmax(0, 1fr))` }}
            onKeyDown={onKeyDown}
          >
            <span
              className="bundle-pill absolute inset-y-1 left-1 rounded-full bg-paper shadow-[0_1px_2px_rgb(23_15_18/0.12)]"
              style={{ width: `calc((100% - 0.5rem) / ${offers.length})`, transform: `translateX(${choice * 100}%)` }}
              aria-hidden="true"
            />
            {offers.map((o, i) => (
              <button
                key={o.items.length}
                ref={(el) => {
                  options.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={i === choice}
                tabIndex={i === choice ? 0 : -1}
                onClick={() => choose(i)}
                className="relative z-10 rounded-full px-3 py-2 transition-colors duration-200"
              >
                {t.name(o.items.length)} <span className="tabular text-wine">{percent(o.discount)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-[1.375rem] leading-none font-semibold">{t.name(n)}</h3>
            <span className="tabular rounded-full bg-wine/10 px-2.5 py-1 text-xs font-semibold text-wine">{percent(offer.discount)}</span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2" aria-hidden="true">
          {all.items.map((p, i) => (
            <Fragment key={p.sku}>
              {i > 0 && (
                <span className="bundle-item text-lg text-muted" data-off={i >= n}>
                  +
                </span>
              )}
              <span className="bundle-item tile relative size-16 shrink-0 sm:size-[4.5rem]" data-off={i >= n}>
                <Image src={p.image} alt="" fill sizes="72px" quality={75} className="p-1.5" />
              </span>
            </Fragment>
          ))}
        </div>

        <ul className="mt-4 space-y-3 text-sm">
          {all.items.slice(1).map((p, i) => (
            <li key={p.sku} className="bundle-item" data-off={i + 1 >= n} aria-hidden={i + 1 >= n || undefined}>
              <Link href={P.product(p.slug)} className="font-medium hover:text-wine" tabIndex={i + 1 >= n ? -1 : undefined}>
                {p.name[locale]}
              </Link>
              <span className="tabular text-muted"> · {price(p.price, locale)}</span>
              <p className="mt-0.5 text-ink-2">{t.roles[all.roles[i]]}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-t border-line pt-4">
          <div>
            <p className="text-xs text-muted">
              {t.was} <s className="tabular">{price(offer.price, locale)}</s>
            </p>
            <p className="tabular mt-0.5 text-xl font-semibold">{price(total, locale)}</p>
            <p className="text-xs font-medium text-moss">{t.save(price(offer.saving, locale))}</p>
          </div>
          <button type="button" className="btn btn-wine morph relative min-w-0 px-5" onClick={take}>
            <span data-hidden={added}>{t.take(n)}</span>
            <span data-hidden={!added} className="absolute inset-0 inline-flex items-center justify-center gap-2" aria-hidden={!added}>
              <IconCheck size={18} />
              {t.added}
            </span>
          </button>
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {added ? t.addedStatus : ""}
        </span>
      </div>
    </section>
  );
}
