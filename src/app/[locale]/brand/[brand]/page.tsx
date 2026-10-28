import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/components/listing/Listing";
import { isLocale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { alternates, paths } from "@/i18n/paths";
import { getBrand, list, parseFilters } from "@/lib/catalog";
import { clip } from "@/lib/format";
import { brandIntro } from "@/lib/intros";
import { categoryChips } from "@/lib/listing-chips";

type Props = { params: Promise<{ locale: string; brand: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, brand } = await params;
  const b = getBrand(brand);
  if (!b || !isLocale(locale)) return {};
  const description = clip(brandIntro(b.slug, locale)?.lede ?? DICT[locale].meta.brandDescription(b.name, b.count));
  return { title: b.name, description, alternates: alternates(locale, `/brand/${b.slug}`) };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { locale, brand } = await params;
  const b = getBrand(brand);
  if (!b || !isLocale(locale)) notFound();
  const t = DICT[locale];
  const P = paths(locale);
  const filters = { ...parseFilters(await searchParams), brands: [] };
  const result = list({ brand: b.slug }, filters, locale);
  const basePath = P.brand(b.slug);
  const intro = brandIntro(b.slug, locale);

  return (
    <Listing
      locale={locale}
      crumbs={[{ href: P.home(), label: t.common.home }, { href: P.brands(), label: t.common.brands }, { label: b.name }]}
      eyebrow={t.common.brand}
      title={b.name}
      lede={intro?.lede}
      about={intro && { title: t.listing.aboutBrand(b.name), paragraphs: intro.about }}
      chips={result.facets.categories.length > 1 || filters.cat ? categoryChips(locale, basePath, filters, result) : undefined}
      basePath={basePath}
      filters={filters}
      result={result}
      hideBrandFilter
    />
  );
}
