import { INTL, type Locale } from "@/i18n/config";

const money = new Map<Locale, Intl.NumberFormat>();
const plain = new Map<Locale, Intl.NumberFormat>();

/** "34,90 €" in Bulgarian, "€34.90" in English. */
export function price(value: number, locale: Locale): string {
  let f = money.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(INTL[locale], { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
    money.set(locale, f);
  }
  // Keep the amount and the currency sign together on one line.
  return f.format(value).replace(/\s/g, " ");
}

/** "2377" / "2,377" */
export function count(value: number, locale: Locale): string {
  let f = plain.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(INTL[locale]);
    plain.set(locale, f);
  }
  return f.format(value);
}

/** "18,5" / "18.5" */
export function decimal(value: string, locale: Locale): string {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat(INTL[locale], { maximumFractionDigits: 1 }).format(n) : value;
}

/** Whole amounts without decimals: "59 €" / "€59" (used for thresholds in running text). */
export function priceShort(value: number, locale: Locale): string {
  if (!Number.isInteger(value)) return price(value, locale);
  return new Intl.NumberFormat(INTL[locale], { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value).replace(/\s/g, " ");
}

/** Cuts text at a word boundary, e.g. for a meta description. */
export function clip(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max - 1)).replace(/[,;:—–-]$/, "")}…`;
}
