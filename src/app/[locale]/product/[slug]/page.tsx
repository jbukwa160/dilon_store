import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/cart/AddToCart";
import { type BundleOffer, BundleOffers } from "@/components/BundleOffers";
import { IconBox, IconCash, IconCheck, IconReturn, IconTruck } from "@/components/Icons";
import { Breadcrumbs } from "@/components/listing/Listing";
import { ProductGrid } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductImage } from "@/components/ProductImage";
import { isLocale, type Locale, locales, localePath } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { alternates, paths } from "@/i18n/paths";
import { bundlesFor } from "@/lib/bundles";
import { allProducts, getBySku, getProduct, related, toCard } from "@/lib/catalog";
import { getDetails } from "@/lib/details";
import { decimal, price, priceShort } from "@/lib/format";
import { SHIPPING, SITE } from "@/lib/site";
import { CATEGORY_BY_ID, findSub } from "@/lib/taxonomy";
import type { Feature, FeatureKey, ProductDetails, SpecKey } from "@/lib/types";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => allProducts().map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = getProduct(slug);
  if (!p || !isLocale(locale)) return {};
  const sub = findSub(p.category, p.sub)!;
  const name = p.name[locale];
  const lead = getDetails(p.sku)?.copy?.[locale].lead;
  const description = lead ? clip(lead, 160) : DICT[locale].product.metaDescription(name, p.brand, price(p.price, locale), sub.name[locale]);
  return {
    title: name,
    description,
    alternates: alternates(locale, `/product/${p.slug}`),
    openGraph: { title: name, description, images: [{ url: p.image }] },
  };
}

/** Cuts text at a word boundary. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max - 1)).replace(/[,;:—–-]$/, "")}…`;
}

/** Facts read from the name that a spec from the description already covers. */
const COVERED_BY: Partial<Record<FeatureKey, SpecKey[]>> = {
  size: ["length", "size"],
  clothing: ["size"],
  volume: ["volume"],
  weight: ["weight"],
  count: ["count"],
  colour: ["colour"],
  waterproof: ["waterproof"],
  silicone: ["material"],
  glass: ["material"],
  metal: ["material"],
  leather: ["material"],
  lace: ["material"],
};

/**
 * Specs from the description, then facts read from the name that no spec covers, as label/value rows.
 * Facts without a value ("Waterproof") are grouped into one "Features" row.
 */
function factRows(features: Feature[], specs: ProductDetails["specs"], locale: Locale): [string, string][] {
  const t = DICT[locale].features;
  const rows: [string, string][] = specs.map((s) => [DICT[locale].specs[s.key], s.value[locale]]);
  const flags: string[] = [];
  const keys = new Set(specs.map((s) => s.key));
  for (const [key, value] of features) {
    if (COVERED_BY[key]?.some((k) => keys.has(k))) continue;
    switch (key) {
      case "size":
        rows.push([t.size, `${decimal(value!, locale)} ${t.units.cm}`]);
        break;
      case "volume":
        rows.push([t.volume, `${value} ${t.units.ml}`]);
        break;
      case "weight":
        rows.push([t.weight, `${value} ${t.units.g}`]);
        break;
      case "count":
        rows.push([t.count, value!]);
        break;
      case "clothing":
        rows.push([t.clothing, value!]);
        break;
      case "colour":
        rows.push([t.colour, t.colours[value!] ?? value!]);
        break;
      default:
        if (t.flags[key]) flags.push(t.flags[key]);
    }
  }
  if (flags.length) rows.push([DICT[locale].product.features, flags.join(" · ")]);
  return rows;
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  const p = getProduct(slug);
  if (!p || !isLocale(locale)) notFound();
  const t = DICT[locale];
  const P = paths(locale);
  const category = CATEGORY_BY_ID.get(p.category)!;
  const sub = findSub(p.category, p.sub)!;
  const name = p.name[locale];
  const details = getDetails(p.sku);
  const copy = details?.copy?.[locale];
  const images = [p.image, ...(details?.gallery ?? [])];
  const offers: BundleOffer[] = bundlesFor(p).map((b) => ({
    items: b.skus.map((sku) => toCard(getBySku(sku)!)),
    roles: b.roles,
    discount: b.discount,
    price: b.price,
    saving: b.saving,
  }));
  const more = related(p, 4);
  const inStock = p.stock > 0;
  const fromPrice = price(SHIPPING.methods[0].price, locale);
  const free = priceShort(SHIPPING.freeFrom, locale);
  const facts: [string, React.ReactNode][] = [
    ...(p.brand
      ? [[t.common.brand, <Link key="b" href={P.brand(p.brandSlug)} className="link-underline">{p.brand}</Link>] as [string, React.ReactNode]]
      : []),
    [t.product.type, <Link key="s" href={P.category(category.id, sub.id)} className="link-underline">{sub.name[locale]}</Link>],
    ...factRows(p.features, details?.specs ?? [], locale),
    [t.product.code, <span key="c" className="tabular">{p.sku.replace(/^Dilon-/, "")}</span>],
    ...(p.ean ? [["EAN", <span key="e" className="tabular">{p.ean}</span>] as [string, React.ReactNode]] : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image: images,
    ...(copy ? { description: [copy.lead, ...copy.body].join(" ") } : {}),
    sku: p.sku,
    ...(p.ean ? { gtin: p.ean } : {}),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    category: `${category.name[locale]} > ${sub.name[locale]}`,
    offers: {
      "@type": "Offer",
      url: `${SITE.url}${localePath(locale, `/product/${p.slug}`)}`,
      priceCurrency: "EUR",
      price: p.price.toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="mx-auto max-w-[82rem] px-4 pt-6 sm:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs
        locale={locale}
        items={[
          { href: P.home(), label: t.common.home },
          { href: P.category(category.id), label: category.name[locale] },
          { href: P.category(category.id, sub.id), label: sub.name[locale] },
          { label: name },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-16">
        <div className="min-w-0">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            {images.length > 1 ? (
              <ProductGallery images={images} alt={name} />
            ) : (
              <ProductImage src={p.image} alt={name} sizes="(min-width: 1320px) 660px, (min-width: 1024px) 50vw, 100vw" highPriority pad="p-[8%]" className="rounded-lg" />
            )}
          </div>
        </div>

        <div className="min-w-0">
          {p.brand && (
            <Link href={P.brand(p.brandSlug)} className="eyebrow text-wine hover:underline">
              {p.brand}
            </Link>
          )}
          <h1 className="font-display mt-2 text-[2.1rem] leading-[1.08] font-semibold sm:text-[2.75rem]">{name}</h1>
          {copy && <p className="mt-4 max-w-[38rem] text-[1.0625rem] leading-relaxed text-ink-2">{copy.lead}</p>}

          <div className="mt-5 flex items-baseline gap-3">
            <p className="tabular text-[1.75rem] font-semibold">{price(p.price, locale)}</p>
            <p className="text-xs text-muted">{t.product.withVat}</p>
          </div>

          <p className="mt-3 flex items-center gap-2 text-sm">
            <span className={`size-2 rounded-full ${inStock ? "bg-moss" : "bg-muted"}`} aria-hidden="true" />
            {inStock ? (
              <span>
                <strong className="font-semibold text-moss">{t.product.inStock}</strong>
                {p.stock <= 3 && <span className="text-ink-2"> · {t.product.lastN(p.stock)}</span>}
                <span className="text-ink-2"> · {t.product.deliveryIn(SHIPPING.days)}</span>
              </span>
            ) : (
              <span className="text-ink-2">
                <strong className="font-semibold text-ink">{t.product.soldOut}</strong> {t.product.soldOutText}
              </span>
            )}
          </p>

          <div className="mt-7">
            <AddToCart product={toCard(p)} />
          </div>

          <ul className="mt-7 grid gap-3 rounded-lg bg-sand/70 p-5 text-sm sm:grid-cols-2">
            <li className="flex gap-3">
              <IconBox size={20} className="mt-0.5 shrink-0 text-wine" />
              <span>{t.product.perks.box}</span>
            </li>
            <li className="flex gap-3">
              <IconTruck size={20} className="mt-0.5 shrink-0 text-wine" />
              <span>{t.product.perks.truck(fromPrice, free)}</span>
            </li>
            <li className="flex gap-3">
              <IconCash size={20} className="mt-0.5 shrink-0 text-wine" />
              <span>{t.product.perks.cash}</span>
            </li>
            <li className="flex gap-3">
              <IconReturn size={20} className="mt-0.5 shrink-0 text-wine" />
              <span>{t.product.perks.returns}</span>
            </li>
          </ul>

          {offers.length > 0 && <BundleOffers offers={offers} />}

          {copy && (
            <section className="mt-10" aria-labelledby="description">
              <h2 id="description" className="eyebrow text-muted">
                {t.product.description}
              </h2>
              <div className="mt-3 max-w-[38rem] space-y-3.5 text-[0.9375rem] leading-relaxed text-ink-2">
                {copy.body.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
              {copy.highlights.length > 0 && (
                <>
                  <h3 className="mt-7 text-sm font-semibold">{t.product.highlights}</h3>
                  <ul className="mt-3 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
                    {copy.highlights.map((h) => (
                      <li key={h} className="flex gap-2.5">
                        <IconCheck size={18} className="mt-px shrink-0 text-wine" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          <section className="mt-10" aria-labelledby="facts">
            <h2 id="facts" className="eyebrow text-muted">
              {t.product.details}
            </h2>
            <dl className="mt-3 divide-y divide-line border-y border-line text-sm">
              {facts.map(([k, v], i) => (
                <div key={i} className="grid grid-cols-[9.5rem_1fr] gap-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-8 divide-y divide-line border-y border-line">
            <Accordion title={t.product.howToChoose} open={!copy}>
              <p>{category.about[locale]}</p>
            </Accordion>
            <Accordion title={t.product.care}>
              {copy?.care && <p className="mb-3">{copy.care}</p>}
              <ul className="list-disc space-y-1.5 pl-5">
                {category.care[locale].map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Accordion>
            <Accordion title={t.product.delivery}>
              <p>{t.product.deliveryText(SHIPPING.days, fromPrice, free)}</p>
              <p className="mt-2">
                {t.product.returnsText}{" "}
                <Link href={P.info("returns")} className="link-underline text-wine">
                  {t.product.moreReturns}
                </Link>
              </p>
            </Accordion>
          </div>
        </div>
      </div>

      {more.length > 0 && (
        <section className="mt-24" aria-labelledby="more">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 id="more" className="font-display text-[2rem] leading-none font-semibold sm:text-[2.5rem]">
              {t.product.moreFrom(sub.name[locale])}
            </h2>
            <Link href={P.category(category.id, sub.id)} className="link-underline shrink-0 text-sm font-medium">
              {t.common.seeAll}
            </Link>
          </div>
          <ProductGrid products={more} locale={locale} />
        </section>
      )}
    </div>
  );
}

function Accordion({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="accordion group" open={open}>
      <summary className="flex items-center justify-between gap-4 py-4 font-medium">
        {title}
        <span className="plus text-xl leading-none text-muted" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="panel pb-5 text-sm leading-relaxed text-ink-2">{children}</div>
    </details>
  );
}
