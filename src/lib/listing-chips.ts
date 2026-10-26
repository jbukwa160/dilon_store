import "server-only";
import type { Locale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import type { ListResult } from "./catalog";
import { type Filters, listingHref } from "./filters";
import { CATEGORY_BY_ID } from "./taxonomy";

/** "All · Vibrators 120 · Lingerie 80 …" chips for listings that span several categories. */
export function categoryChips(locale: Locale, basePath: string, filters: Filters, result: ListResult, q?: string) {
  const total = result.facets.categories.reduce((s, c) => s + c.count, 0);
  return [
    { href: listingHref(basePath, filters, { cat: "" }, q), label: DICT[locale].common.all, count: total, active: !filters.cat },
    ...result.facets.categories.map((c) => ({
      href: listingHref(basePath, filters, { cat: c.id }, q),
      label: CATEGORY_BY_ID.get(c.id)!.name[locale],
      count: c.count,
      active: filters.cat === c.id,
    })),
  ];
}
