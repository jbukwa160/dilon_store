import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import type { ListResult } from "@/lib/catalog";
import { type Filters, listingHref } from "@/lib/filters";
import { count } from "@/lib/format";
import { IconChevron } from "../Icons";
import { ProductGrid } from "../ProductCard";
import { FilterPanel, ListingShell, SortSelect } from "./ListingClient";

export type Crumb = { href?: string; label: string };
export type Chip = { href: string; label: string; count: number; active: boolean };

export function Breadcrumbs({ items, locale }: { items: Crumb[]; locale: Locale }) {
  return (
    <nav aria-label={DICT[locale].common.breadcrumb} className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <IconChevron size={12} className="opacity-60" />}
            {c.href ? (
              <Link href={c.href} className="hover:text-wine">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-2">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Listing({
  locale,
  crumbs,
  eyebrow,
  title,
  lede,
  chips,
  basePath,
  filters,
  result,
  q,
  hideBrandFilter = false,
  empty,
  about,
}: {
  locale: Locale;
  crumbs: Crumb[];
  eyebrow?: string;
  title: string;
  lede?: string;
  chips?: Chip[];
  basePath: string;
  filters: Filters;
  result: ListResult;
  q?: string;
  hideBrandFilter?: boolean;
  empty?: React.ReactNode;
  /** Text under the products, on the first page only. */
  about?: { title: string; paragraphs: string[] };
}) {
  const t = DICT[locale];
  const activeCount = filters.brands.length + (filters.price ? 1 : 0) + (filters.stock ? 1 : 0);
  return (
    <div className="mx-auto max-w-[82rem] px-4 pt-6 sm:px-8">
      <Breadcrumbs items={crumbs} locale={locale} />
      <header className="mt-6 max-w-3xl">
        {eyebrow && <p className="eyebrow text-wine">{eyebrow}</p>}
        <h1 className="font-display mt-2 text-[2.6rem] leading-[1.02] font-semibold sm:text-[3.5rem]">{title}</h1>
        {lede && <p className="mt-3 text-[1.0625rem] text-ink-2">{lede}</p>}
      </header>

      {chips && chips.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-7 overflow-x-auto px-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0">
          <ul className="flex w-max gap-2 lg:w-auto lg:flex-wrap">
            {chips.map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  aria-current={c.active ? "page" : undefined}
                  className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap transition-colors duration-150 ${
                    c.active ? "border-ink bg-ink text-bone" : "border-line bg-paper hover:border-ink/40"
                  }`}
                >
                  {c.label}
                  <span className={`tabular text-xs ${c.active ? "text-bone/60" : "text-muted"}`}>{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ListingShell
        className="mt-8 grid gap-10 lg:grid-cols-[15rem_1fr]"
        sidebar={
          <FilterPanel
            basePath={basePath}
            filters={filters}
            facets={result.facets}
            q={q}
            hideBrands={hideBrandFilter}
            activeCount={activeCount}
            total={result.total}
          />
        }
      >
        <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
          <p className="tabular text-sm text-ink-2" aria-live="polite">
            {t.common.products(count(result.total, locale), result.total === 1)}
          </p>
          <SortSelect basePath={basePath} filters={filters} q={q} />
        </div>
        <div className="results mt-6">
          {result.items.length ? (
            <ProductGrid products={result.items} locale={locale} eagerFirst={4} />
          ) : (
            (empty ?? (
              <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center">
                <p className="font-display text-2xl font-semibold">{t.listing.emptyTitle}</p>
                <p className="mt-2 text-sm text-muted">{t.listing.emptyText}</p>
                {activeCount > 0 && (
                  <Link href={listingHref(basePath, filters, { brands: [], price: "", stock: false }, q)} className="btn btn-line mt-6">
                    {t.listing.clear}
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
        {result.pages > 1 && <Pagination locale={locale} basePath={basePath} filters={filters} page={result.page} pages={result.pages} q={q} />}
      </ListingShell>

      {about && about.paragraphs.length > 0 && result.page === 1 && (
        <section className="mt-20 max-w-3xl border-t border-line pt-10" aria-labelledby="about">
          <h2 id="about" className="font-display text-[1.75rem] leading-tight font-semibold sm:text-[2rem]">
            {about.title}
          </h2>
          <div className="mt-4 space-y-3.5 text-[0.9375rem] leading-relaxed text-ink-2">
            {about.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Pagination({ locale, basePath, filters, page, pages, q }: { locale: Locale; basePath: string; filters: Filters; page: number; pages: number; q?: string }) {
  const t = DICT[locale].listing;
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const list = [...nums].sort((a, b) => a - b);
  const href = (n: number) => listingHref(basePath, filters, { page: n }, q);
  return (
    <nav aria-label={t.pages} className="mt-14 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} className="btn btn-line min-h-10 px-4 text-sm" rel="prev">
          {t.prev}
        </Link>
      )}
      <ol className="flex items-center gap-1">
        {list.map((n, i) => (
          <li key={n} className="flex items-center gap-1">
            {i > 0 && list[i - 1] !== n - 1 && <span className="px-1 text-muted">…</span>}
            <Link
              href={href(n)}
              aria-current={n === page ? "page" : undefined}
              className={`tabular grid size-10 place-items-center rounded-full text-sm ${n === page ? "bg-ink text-bone" : "hover:bg-sand"}`}
            >
              {n}
            </Link>
          </li>
        ))}
      </ol>
      {page < pages && (
        <Link href={href(page + 1)} className="btn btn-line min-h-10 px-4 text-sm" rel="next">
          {t.next}
        </Link>
      )}
    </nav>
  );
}
