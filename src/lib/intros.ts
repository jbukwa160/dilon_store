import "server-only";
import data from "@/data/intros.json";
import type { Locale } from "@/i18n/config";

// Intro texts of subcategory and brand pages (src/data/intros.json, written by `npm run intros`).
type Intro = { lede: string; about: string[] };
type Entry = Record<Locale, Intro> & { source: string };
const INTROS = data as unknown as { subs: Record<string, Entry>; brands: Record<string, Entry> };

export const subIntro = (category: string, sub: string, locale: Locale): Intro | undefined => INTROS.subs[`${category}/${sub}`]?.[locale];
export const brandIntro = (slug: string, locale: Locale): Intro | undefined => INTROS.brands[slug]?.[locale];
