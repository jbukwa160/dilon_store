import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/components/listing/Listing";
import { isLocale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { alternates, paths } from "@/i18n/paths";
import { count } from "@/lib/format";
import { list, NAV, parseFilters } from "@/lib/catalog";

type Props = { params: Promise<{ locale: string; cat: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, cat } = await params;
  const category = NAV.find((c) => c.id === cat);
  if (!category || !isLocale(locale)) return {};
  return { title: category.name[locale], description: category.lede[locale], alternates: alternates(locale, `/category/${category.id}`) };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, cat } = await params;
  const category = NAV.find((c) => c.id === cat);
  if (!category || !isLocale(locale)) notFound();
  const t = DICT[locale];
  const P = paths(locale);
  // Sub-category pages are their own URLs, so the category filter does not apply here.
  const filters = { ...parseFilters(await searchParams), cat: "" };
  const result = list({ category: category.id }, filters, locale);

  return (
    <Listing
      locale={locale}
      crumbs={[{ href: P.home(), label: t.common.home }, { label: category.name[locale] }]}
      eyebrow={t.listing.countProducts(count(category.count, locale))}
      title={category.name[locale]}
      lede={category.lede[locale]}
      chips={[
        { href: P.category(category.id), label: t.common.all, count: category.count, active: true },
        ...category.subs.map((s) => ({ href: P.category(category.id, s.id), label: s.name[locale], count: s.count, active: false })),
      ]}
      basePath={P.category(category.id)}
      filters={filters}
      result={result}
    />
  );
}
