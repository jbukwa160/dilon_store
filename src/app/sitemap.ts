import type { MetadataRoute } from "next";
import { INFO_SLUGS } from "@/content/pages";
import { localePath } from "@/i18n/config";
import { allProducts, BRANDS, NAV } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import { AUDIENCES } from "@/lib/taxonomy";

type Entry = MetadataRoute.Sitemap[number];

/** One entry per page and language, each listing its other-language version. */
export default function sitemap(): MetadataRoute.Sitemap {
  const both = (path: string, changeFrequency: Entry["changeFrequency"], priority: number): Entry[] => {
    const languages = { bg: `${SITE.url}${localePath("bg", path)}`, en: `${SITE.url}${localePath("en", path)}` };
    return [
      { url: languages.bg, changeFrequency, priority, alternates: { languages } },
      { url: languages.en, changeFrequency, priority: Math.max(0.1, priority - 0.1), alternates: { languages } },
    ];
  };
  return [
    ...both("/", "daily", 1),
    ...NAV.flatMap((c) => [...both(`/category/${c.id}`, "daily", 0.8), ...c.subs.flatMap((s) => both(`/category/${c.id}/${s.id}`, "daily", 0.7))]),
    ...AUDIENCES.flatMap((a) => both(`/for/${a.id}`, "weekly", 0.6)),
    ...both("/brands", "weekly", 0.5),
    ...BRANDS.flatMap((b) => both(`/brand/${b.slug}`, "weekly", 0.4)),
    ...allProducts().flatMap((p) => both(`/product/${p.slug}`, "weekly", 0.6)),
    ...INFO_SLUGS.flatMap((s) => both(`/info/${s}`, "yearly", 0.2)),
  ];
}
