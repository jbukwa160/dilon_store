import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/components/listing/Listing";
import { isLocale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { alternates, paths } from "@/i18n/paths";
import { list, NAV, parseFilters } from "@/lib/catalog";
import { clip } from "@/lib/format";
import { subIntro } from "@/lib/intros";

type Props = {
  params: Promise<{ locale: string; cat: string; sub: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function find(cat: string, sub: string) {
  const category = NAV.find((c) => c.id === cat);
  const subcategory = category?.subs.find((s) => s.id === sub);
  return category && subcategory ? { category, subcategory } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, cat, sub } = await params;
  const found = find(cat, sub);
  if (!found || !isLocale(locale)) return {};
  const { category, subcategory } = found;
  return {
    title: `${subcategory.name[locale]} — ${category.name[locale]}`,
    description: clip(subIntro(cat, sub, locale)?.lede ?? DICT[locale].meta.subDescription(subcategory.name[locale], subcategory.count, category.lede[locale])),
    alternates: alternates(locale, `/category/${cat}/${sub}`),
  };
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const { locale, cat, sub } = await params;
  const found = find(cat, sub);
  if (!found || !isLocale(locale)) notFound();
  const { category, subcategory } = found;
  const t = DICT[locale];
  const P = paths(locale);
  const filters = { ...parseFilters(await searchParams), cat: "" };
  const result = list({ category: category.id, sub: subcategory.id }, filters, locale);
  const intro = subIntro(category.id, subcategory.id, locale);

  return (
    <Listing
      locale={locale}
      crumbs={[{ href: P.home(), label: t.common.home }, { href: P.category(category.id), label: category.name[locale] }, { label: subcategory.name[locale] }]}
      eyebrow={category.name[locale]}
      title={subcategory.name[locale]}
      lede={intro?.lede ?? category.lede[locale]}
      about={intro && { title: t.listing.aboutCategory(subcategory.name[locale]), paragraphs: intro.about }}
      chips={[
        { href: P.category(category.id), label: t.common.all, count: category.count, active: false },
        ...category.subs.map((s) => ({ href: P.category(category.id, s.id), label: s.name[locale], count: s.count, active: s.id === subcategory.id })),
      ]}
      basePath={P.category(category.id, subcategory.id)}
      filters={filters}
      result={result}
    />
  );
}
