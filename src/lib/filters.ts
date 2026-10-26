// Listing filters shared by the server (catalog queries) and the browser (filter panel). Labels are in i18n/dict.ts.

export const SORT_IDS = ["", "new", "price-asc", "price-desc"] as const;
export type SortId = (typeof SORT_IDS)[number];

export const PRICE_BANDS = [
  { id: "0-20", min: 0, max: 20 },
  { id: "20-40", min: 20, max: 40 },
  { id: "40-70", min: 40, max: 70 },
  { id: "70-plus", min: 70, max: Infinity },
] as const;

/** `cat` narrows listings that span several categories (For her/him, search, brand pages). */
export type Filters = { brands: string[]; price: string; stock: boolean; sort: SortId; page: number; cat: string };

export type Facets = {
  brands: { slug: string; name: string; count: number }[];
  prices: { id: string; count: number }[];
  categories: { id: string; count: number }[];
  inStock: number;
};

/** Listing URL that keeps the current filters and applies `change`. Any change except paging goes back to page 1. */
export function listingHref(basePath: string, f: Filters, change: Partial<Filters>, q?: string): string {
  const next = { ...f, page: 1, ...change };
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (next.cat) sp.set("cat", next.cat);
  if (next.brands.length) sp.set("brand", next.brands.join(","));
  if (next.price) sp.set("price", next.price);
  if (next.stock) sp.set("stock", "1");
  if (next.sort) sp.set("sort", next.sort);
  if (next.page > 1) sp.set("page", String(next.page));
  const s = sp.toString();
  return s ? `${basePath}?${s}` : basePath;
}
