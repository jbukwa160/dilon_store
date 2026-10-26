export const locales = ["bg", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "bg";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/** Bulgarian is served without a prefix (/category/x), English under /en (/en/category/x). Slugs are the same. */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** Removes the /en prefix: "/en/product/x" → "/product/x". */
export function stripLocale(pathname: string): string {
  for (const l of locales) {
    if (l === defaultLocale) continue;
    if (pathname === `/${l}`) return "/";
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(l.length + 1);
  }
  return pathname;
}

/** Locale used for Intl number formatting. English uses the Irish locale: euro with "€34.90". */
export const INTL: Record<Locale, string> = { bg: "bg-BG", en: "en-IE" };

export const OG_LOCALE: Record<Locale, string> = { bg: "bg_BG", en: "en_GB" };
