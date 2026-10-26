import "server-only";
import data from "@/data/catalog.json";
import type { Locale } from "@/i18n/config";
import { type Facets, type Filters, PRICE_BANDS, SORT_IDS, type SortId } from "./filters";
import { type AudienceId, CATEGORIES, CATEGORY_BY_ID } from "./taxonomy";
import type { Brand, CardProduct, Product } from "./types";

const PRODUCTS = data as unknown as Product[];
const BY_SLUG = new Map(PRODUCTS.map((p) => [p.slug, p]));
const BY_SKU = new Map(PRODUCTS.map((p) => [p.sku, p]));

export const allProducts = (): readonly Product[] => PRODUCTS;
export const getProduct = (slug: string) => BY_SLUG.get(slug);
export const getBySku = (sku: string) => BY_SKU.get(sku);
export const productCount = PRODUCTS.length;

export const BRANDS: Brand[] = (() => {
  const map = new Map<string, Brand>();
  for (const p of PRODUCTS) {
    if (!p.brandSlug) continue;
    const b = map.get(p.brandSlug) ?? { slug: p.brandSlug, name: p.brand, count: 0 };
    b.count++;
    map.set(p.brandSlug, b);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
})();
export const getBrand = (slug: string) => BRANDS.find((b) => b.slug === slug);

/** Products per category, per "category/sub" and per audience ("for/her"). */
export const COUNTS: Map<string, number> = (() => {
  const m = new Map<string, number>();
  const inc = (k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const p of PRODUCTS) {
    inc(p.category);
    inc(`${p.category}/${p.sub}`);
    for (const a of p.audiences) inc(`for/${a}`);
  }
  return m;
})();

/** Categories with only the subcategories that have products, with counts. */
export const NAV = CATEGORIES.map((c) => ({
  ...c,
  count: COUNTS.get(c.id) ?? 0,
  subs: c.subs.map((s) => ({ ...s, count: COUNTS.get(`${c.id}/${s.id}`) ?? 0 })).filter((s) => s.count > 0),
})).filter((c) => c.count > 0);

export type NavCategory = (typeof NAV)[number];

// ── Listing ──

export const PAGE_SIZE = 24;

export type Scope = { category?: string; sub?: string; audience?: AudienceId; brand?: string; q?: string };

/** Reads filters from the URL query. Unknown values are ignored instead of failing. */
export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined)) ?? "";
  const sort = (SORT_IDS as readonly string[]).includes(one("sort")) ? (one("sort") as SortId) : "";
  const price = PRICE_BANDS.some((b) => b.id === one("price")) ? one("price") : "";
  const brands = one("brand").split(",").map((b) => b.trim()).filter((b) => b && BRANDS.some((x) => x.slug === b));
  const page = Math.max(1, Math.min(500, Math.floor(Number(one("page")) || 1)));
  const cat = CATEGORY_BY_ID.has(one("cat")) ? one("cat") : "";
  return { brands, price, stock: one("stock") === "1", sort, page, cat };
}

export function normalizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 8);
}

function inScope(p: Product, scope: Scope, tokens: string[]): boolean {
  if (scope.category && p.category !== scope.category) return false;
  if (scope.sub && p.sub !== scope.sub) return false;
  if (scope.audience && !p.audiences.includes(scope.audience)) return false;
  if (scope.brand && p.brandSlug !== scope.brand) return false;
  if (tokens.length && !tokens.every((t) => p.search.includes(t))) return false;
  return true;
}

function searchScore(p: Product, tokens: string[], phrase: string, locale: Locale): number {
  const name = p.name[locale].toLowerCase();
  const other = p.name[locale === "bg" ? "en" : "bg"].toLowerCase();
  let score = name.includes(phrase) ? 20 : other.includes(phrase) ? 12 : 0;
  for (const t of tokens) {
    if (name.startsWith(t)) score += 6;
    else if (name.includes(t)) score += 3;
    else if (other.includes(t)) score += 2;
    if (p.brand.toLowerCase().includes(t)) score += 2;
  }
  return score;
}

export function list(scope: Scope, filters: Filters, locale: Locale) {
  const tokens = scope.q ? normalizeQuery(scope.q) : [];
  const base = PRODUCTS.filter((p) => inScope(p, scope, tokens));
  const band = PRICE_BANDS.find((b) => b.id === filters.price);
  const passCat = (p: Product) => !filters.cat || p.category === filters.cat;
  const passBrand = (p: Product) => !filters.brands.length || filters.brands.includes(p.brandSlug);
  const passPrice = (p: Product) => !band || (p.price >= band.min && p.price < band.max);
  const passStock = (p: Product) => !filters.stock || p.stock > 0;

  // Each facet counts with every other active filter applied, so the numbers match what a click would show.
  const brandCounts = new Map<string, number>();
  const priceCounts = new Map<string, number>();
  const catCounts = new Map<string, number>();
  let inStock = 0;
  for (const p of base) {
    const c = passCat(p);
    const b = passBrand(p);
    const pr = passPrice(p);
    const st = passStock(p);
    if (c && pr && st && p.brandSlug) brandCounts.set(p.brandSlug, (brandCounts.get(p.brandSlug) ?? 0) + 1);
    if (c && b && st) {
      const pb = PRICE_BANDS.find((x) => p.price >= x.min && p.price < x.max);
      if (pb) priceCounts.set(pb.id, (priceCounts.get(pb.id) ?? 0) + 1);
    }
    if (b && pr && st) catCounts.set(p.category, (catCounts.get(p.category) ?? 0) + 1);
    if (c && b && pr && p.stock > 0) inStock++;
  }

  const matched = base.filter((p) => passCat(p) && passBrand(p) && passPrice(p) && passStock(p));
  const phrase = tokens.join(" ");
  const sorted = [...matched];
  switch (filters.sort) {
    case "new":
      sorted.sort((a, b) => b.created.localeCompare(a.created) || b.rank - a.rank);
      break;
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price || b.rank - a.rank);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price || b.rank - a.rank);
      break;
    default:
      if (tokens.length) sorted.sort((a, b) => searchScore(b, tokens, phrase, locale) - searchScore(a, tokens, phrase, locale) || b.rank - a.rank);
    // otherwise the catalog is already in "recommended" order
  }

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const facets: Facets = {
    brands: BRANDS.filter((b) => brandCounts.has(b.slug) || filters.brands.includes(b.slug)).map((b) => ({
      slug: b.slug,
      name: b.name,
      count: brandCounts.get(b.slug) ?? 0,
    })),
    prices: PRICE_BANDS.map((b) => ({ id: b.id, count: priceCounts.get(b.id) ?? 0 })),
    categories: CATEGORIES.filter((c) => catCounts.has(c.id)).map((c) => ({ id: c.id, count: catCounts.get(c.id)! })),
    inStock,
  };
  return { items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: sorted.length, page, pages, facets };
}

export type ListResult = ReturnType<typeof list>;

// ── Collections for the home page and product pages ──

/** Best in-stock products, at most `perBrand` from one brand, optionally limited to some categories. */
export function featured(limit: number, opts: { categories?: string[]; perBrand?: number; withSupplierPhoto?: boolean } = {}): Product[] {
  const perBrand = opts.perBrand ?? 2;
  const used = new Map<string, number>();
  const out: Product[] = [];
  for (const p of PRODUCTS) {
    if (out.length >= limit) break;
    if (p.stock <= 0) continue;
    if (opts.categories && !opts.categories.includes(p.category)) continue;
    if (opts.withSupplierPhoto && !p.image.includes("sexwellshop.com")) continue;
    const key = p.brandSlug || p.sku;
    if ((used.get(key) ?? 0) >= perBrand) continue;
    used.set(key, (used.get(key) ?? 0) + 1);
    out.push(p);
  }
  return out;
}

export function newest(limit: number): Product[] {
  return [...PRODUCTS]
    .filter((p) => p.stock > 0)
    .sort((a, b) => b.created.localeCompare(a.created) || b.rank - a.rank)
    .slice(0, limit);
}

export function related(p: Product, limit: number): Product[] {
  const same = PRODUCTS.filter((x) => x.sub === p.sub && x.category === p.category && x.sku !== p.sku);
  const pool = same.length >= limit ? same : [...same, ...PRODUCTS.filter((x) => x.category === p.category && x.sub !== p.sub)];
  // Prefer in-stock products with a similar price.
  return pool
    .map((x) => ({ x, d: Math.abs(x.price - p.price) / p.price - (x.stock > 0 ? 0.5 : 0) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((r) => r.x);
}

/**
 * A product photo for the category, used in the mega menu and the category index on the home page.
 * Skips the first products of the listing, so the hidden menu photo is never the same picture as the first
 * (eagerly loaded) cards of the page.
 */
export function coverFor(category: string): Product | undefined {
  const candidates = PRODUCTS.filter((p) => p.category === category && p.stock > 0 && p.image.includes("sexwellshop.com"));
  return candidates[8] ?? candidates.at(-1) ?? PRODUCTS.find((p) => p.category === category);
}

/** Lightweight product data for client components (cart, search suggestions), in both languages. */
export function toCard(p: Product): CardProduct {
  return { sku: p.sku, slug: p.slug, name: p.name, brand: p.brand, price: p.price, image: p.image, stock: p.stock };
}
