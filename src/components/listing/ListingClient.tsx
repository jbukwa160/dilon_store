"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useId, useRef, useState, useTransition } from "react";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { type Facets, type Filters, listingHref, SORT_IDS, type SortId } from "@/lib/filters";
import { count } from "@/lib/format";
import { IconCheck, IconClose, IconFilter } from "../Icons";
import { useDialog } from "../useDialog";

const NavCtx = createContext<(href: string) => void>(() => {});

/** Wraps the listing so filter changes keep the old results on screen (dimmed) until the new ones arrive. */
export function ListingShell({ sidebar, children, className }: { sidebar: React.ReactNode; children: React.ReactNode; className?: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (href: string) => startTransition(() => router.push(href, { scroll: false }));
  return (
    <NavCtx.Provider value={navigate}>
      <div className={`listing ${className ?? ""}`} data-pending={pending} aria-busy={pending}>
        <aside>{sidebar}</aside>
        <section aria-label={t.listing.productsSection} className="min-w-0">
          {children}
        </section>
      </div>
    </NavCtx.Provider>
  );
}

export function SortSelect({ basePath, filters, q }: { basePath: string; filters: Filters; q?: string }) {
  const navigate = useContext(NavCtx);
  const t = useT().listing;
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="hidden text-sm text-muted sm:block">
        {t.sortBy}
      </label>
      <div className="relative">
        <select
          id={id}
          value={filters.sort}
          onChange={(e) => navigate(listingHref(basePath, filters, { sort: e.target.value as SortId }, q))}
          className="h-10 appearance-none rounded-full border border-line bg-paper pr-9 pl-4 text-sm font-medium outline-none focus-visible:border-ink"
        >
          {SORT_IDS.map((id) => (
            <option key={id} value={id}>
              {t.sorts[id]}
            </option>
          ))}
        </select>
        <svg className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

type PanelProps = {
  basePath: string;
  filters: Filters;
  facets: Facets;
  q?: string;
  hideBrands: boolean;
  activeCount: number;
  total: number;
};

export function FilterPanel(props: PanelProps) {
  const t = useT();
  const locale = useLocale();
  const [sheet, setSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  useDialog(sheet, () => setSheet(false), sheetRef);

  return (
    <>
      {/* Phones and tablets: a button that opens the filters as a bottom sheet. */}
      <button type="button" className="btn btn-line min-h-10 w-full text-sm lg:hidden" onClick={() => setSheet(true)} aria-expanded={sheet}>
        <IconFilter size={18} /> {t.listing.filters}
        {props.activeCount ? ` (${props.activeCount})` : ""}
      </button>
      <div className="backdrop lg:hidden" data-open={sheet} onClick={() => setSheet(false)} aria-hidden="true" />
      <div
        ref={sheetRef}
        className="drawer drawer-bottom flex flex-col lg:hidden"
        data-open={sheet}
        role="dialog"
        aria-modal="true"
        aria-label={t.listing.filters}
        aria-hidden={!sheet}
        inert={!sheet}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="font-display text-2xl font-semibold">{t.listing.filters}</p>
          <button type="button" className="icon-btn -mr-2" onClick={() => setSheet(false)} aria-label={t.listing.closeFilters} data-autofocus>
            <IconClose />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <FilterGroups {...props} />
        </div>
        <div className="border-t border-line px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" className="btn btn-wine w-full" onClick={() => setSheet(false)}>
            {t.listing.show(t.common.products(count(props.total, locale), props.total === 1))}
          </button>
        </div>
      </div>

      {/* Desktop: always visible. */}
      <div className="sticky top-[calc(var(--header-h)+1.5rem)] hidden max-h-[calc(100dvh-var(--header-h)-3rem)] overflow-y-auto overscroll-contain pr-2 lg:block">
        <FilterGroups {...props} />
      </div>
    </>
  );
}

function FilterGroups({ basePath, filters, facets, q, hideBrands, activeCount }: PanelProps) {
  const navigate = useContext(NavCtx);
  const t = useT().listing;
  const [allBrands, setAllBrands] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");
  const go = (change: Partial<Filters>) => navigate(listingHref(basePath, filters, change, q));
  const toggleBrand = (slug: string) =>
    go({ brands: filters.brands.includes(slug) ? filters.brands.filter((b) => b !== slug) : [...filters.brands, slug] });

  const brands = facets.brands.filter((b) => !brandQuery || b.name.toLowerCase().includes(brandQuery.toLowerCase()));
  const visibleBrands = allBrands || brandQuery ? brands : brands.slice(0, 8);

  return (
    <div className="space-y-8 text-sm">
      {activeCount > 0 && (
        <button type="button" className="link-underline text-wine" onClick={() => go({ brands: [], price: "", stock: false })}>
          {t.clearFilters(activeCount)}
        </button>
      )}

      <fieldset>
        <legend className="eyebrow mb-3 text-muted">{t.availability}</legend>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            {t.inStockOnly} <span className="tabular text-muted">({facets.inStock})</span>
          </span>
          <span className="relative inline-flex">
            <input type="checkbox" className="peer sr-only" checked={filters.stock} onChange={(e) => go({ stock: e.target.checked })} />
            <span className="h-6 w-10 rounded-full bg-sand-2 transition-colors duration-200 peer-checked:bg-wine peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-wine" />
            <span className="absolute top-1 left-1 size-4 rounded-full bg-paper shadow transition-transform duration-200 ease-out-strong peer-checked:translate-x-4" />
          </span>
        </label>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3 text-muted">{t.price}</legend>
        <ul className="space-y-1">
          {facets.prices.map((b) => {
            const checked = filters.price === b.id;
            return (
              <li key={b.id}>
                <label className={`flex cursor-pointer items-center gap-3 rounded-md py-1.5 ${!b.count && !checked ? "opacity-40" : ""}`}>
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    disabled={!b.count && !checked}
                    onChange={() => go({ price: checked ? "" : b.id })}
                  />
                  <Box checked={checked} round />
                  <span className="flex-1">{t.bands[b.id]}</span>
                  <span className="tabular text-xs text-muted">{b.count}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {!hideBrands && facets.brands.length > 1 && (
        <fieldset>
          <legend className="eyebrow mb-3 text-muted">{t.brand}</legend>
          {facets.brands.length > 12 && (
            <input
              type="search"
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              placeholder={t.searchBrand}
              aria-label={t.searchBrand}
              className="mb-2 h-9 w-full rounded-full border border-line bg-paper px-3.5 text-sm outline-none focus-visible:border-ink"
            />
          )}
          <ul className="space-y-1">
            {visibleBrands.map((b) => {
              const checked = filters.brands.includes(b.slug);
              return (
                <li key={b.slug}>
                  <label className={`flex cursor-pointer items-center gap-3 py-1.5 ${!b.count && !checked ? "opacity-40" : ""}`}>
                    <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggleBrand(b.slug)} />
                    <Box checked={checked} />
                    <span className="flex-1">{b.name}</span>
                    <span className="tabular text-xs text-muted">{b.count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {!brandQuery && brands.length > 8 && (
            <button type="button" className="mt-2 text-sm font-medium text-wine" onClick={() => setAllBrands((v) => !v)} aria-expanded={allBrands}>
              {allBrands ? t.fewer : t.allBrands(brands.length)}
            </button>
          )}
        </fieldset>
      )}
    </div>
  );
}

function Box({ checked, round = false }: { checked: boolean; round?: boolean }) {
  return (
    <span
      className={`grid size-[1.125rem] shrink-0 place-items-center border transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-wine ${
        round ? "rounded-full" : "rounded-[5px]"
      } ${checked ? "border-wine bg-wine text-white" : "border-ink/30 bg-paper"}`}
      aria-hidden="true"
    >
      {checked && <IconCheck size={12} strokeWidth={2.4} />}
    </span>
  );
}
