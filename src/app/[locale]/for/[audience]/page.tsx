import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing } from "@/components/listing/Listing";
import { isLocale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { alternates, paths } from "@/i18n/paths";
import { list, parseFilters } from "@/lib/catalog";
import { categoryChips } from "@/lib/listing-chips";
import { AUDIENCE_BY_ID, type AudienceId } from "@/lib/taxonomy";

type Props = { params: Promise<{ locale: string; audience: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, audience } = await params;
  const a = AUDIENCE_BY_ID.get(audience as AudienceId);
  if (!a || !isLocale(locale)) return {};
  return { title: a.name[locale], description: a.lede[locale], alternates: alternates(locale, `/for/${a.id}`) };
}

export default async function AudiencePage({ params, searchParams }: Props) {
  const { locale, audience } = await params;
  const a = AUDIENCE_BY_ID.get(audience as AudienceId);
  if (!a || !isLocale(locale)) notFound();
  const t = DICT[locale];
  const P = paths(locale);
  const filters = parseFilters(await searchParams);
  const result = list({ audience: a.id }, filters, locale);
  const basePath = P.audience(a.id);

  return (
    <Listing
      locale={locale}
      crumbs={[{ href: P.home(), label: t.common.home }, { label: a.name[locale] }]}
      eyebrow={t.listing.picked}
      title={a.name[locale]}
      lede={a.lede[locale]}
      chips={categoryChips(locale, basePath, filters, result)}
      basePath={basePath}
      filters={filters}
      result={result}
    />
  );
}
