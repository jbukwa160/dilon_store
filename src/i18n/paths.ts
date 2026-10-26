import { localePath, type Locale } from "./config";

/** Public URLs of the shop. Slugs are the same in both languages; English pages live under /en. */
export function paths(locale: Locale) {
  const p = (path: string) => localePath(locale, path);
  return {
    home: () => p("/"),
    category: (cat: string, sub?: string) => p(sub ? `/category/${cat}/${sub}` : `/category/${cat}`),
    product: (slug: string) => p(`/product/${slug}`),
    brand: (slug: string) => p(`/brand/${slug}`),
    brands: () => p("/brands"),
    audience: (id: string) => p(`/for/${id}`),
    search: (q?: string) => p(q ? `/search?q=${encodeURIComponent(q)}` : "/search"),
    checkout: () => p("/checkout"),
    thanks: (n: string) => p(`/checkout/thank-you?n=${encodeURIComponent(n)}`),
    info: (slug: string) => p(`/info/${slug}`),
  };
}

/** Canonical URL and hreflang links for a page that exists in both languages under the same path. */
export function alternates(locale: Locale, path: string) {
  return {
    canonical: localePath(locale, path),
    languages: { bg: localePath("bg", path), en: localePath("en", path), "x-default": localePath("bg", path) },
  };
}
