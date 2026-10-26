import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { paths } from "@/i18n/paths";
import { toCard } from "@/lib/catalog";
import { price } from "@/lib/format";
import type { Product } from "@/lib/types";
import { QuickAdd } from "./cart/AddToCart";
import { ProductImage } from "./ProductImage";

export const CARD_SIZES = "(min-width: 1280px) 300px, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 46vw";

export function ProductCard({ product, locale, eager = false }: { product: Product; locale: Locale; eager?: boolean }) {
  const soldOut = product.stock <= 0;
  const name = product.name[locale];
  return (
    <article className="card group relative">
      <Link href={paths(locale).product(product.slug)} className="block">
        <div className="relative">
          <ProductImage src={product.image} alt={name} sizes={CARD_SIZES} eager={eager} className={soldOut ? "opacity-70" : ""} />
          {soldOut && (
            <span className="absolute top-2.5 left-2.5 rounded-full bg-paper/90 px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide text-ink-2">
              {DICT[locale].card.soldOut}
            </span>
          )}
        </div>
        <div className="mt-3 pr-1">
          {product.brand && <p className="eyebrow text-[0.625rem] text-muted">{product.brand}</p>}
          <h3 className="mt-1 line-clamp-2 text-[0.9375rem] leading-snug transition-colors duration-150 group-hover:text-wine">{name}</h3>
          <p className={`tabular mt-1.5 font-semibold ${soldOut ? "text-muted" : ""}`}>{price(product.price, locale)}</p>
        </div>
      </Link>
      {/* Sits on top of the photo, outside the link, so it is its own button. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
        <div className="pointer-events-auto">
          <QuickAdd product={toCard(product)} />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, locale, eagerFirst = 0 }: { products: Product[]; locale: Locale; eagerFirst?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((p, i) => (
        <li key={p.sku}>
          <ProductCard product={p} locale={locale} eager={i < eagerFirst} />
        </li>
      ))}
    </ul>
  );
}
