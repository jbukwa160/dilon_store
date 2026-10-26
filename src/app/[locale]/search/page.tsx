import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Listing } from "@/components/listing/Listing";
import { isLocale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { paths } from "@/i18n/paths";
import { list, NAV, parseFilters } from "@/lib/catalog";
import { categoryChips } from "@/lib/listing-chips";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: DICT[locale].search.pageTitle, robots: { index: false, follow: true } };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = DICT[locale];
  const P = paths(locale);
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 80) ?? "";
  const filters = parseFilters(sp);
  // Without a query the page shows the empty state instead of the whole catalog.
  const result = list(q ? { q } : { category: "-" }, filters, locale);
  const basePath = P.search();

  return (
    <Listing
      locale={locale}
      crumbs={[{ href: P.home(), label: t.common.home }, { label: t.search.pageTitle }]}
      eyebrow={t.search.pageTitle}
      title={q ? t.search.quote(q) : t.search.askTitle}
      lede={q ? undefined : t.search.askText}
      chips={q && (result.facets.categories.length > 1 || filters.cat) ? categoryChips(locale, basePath, filters, result, q) : undefined}
      basePath={basePath}
      q={q}
      filters={filters}
      result={result}
      empty={
        <div className="rounded-lg border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-2xl font-semibold">{q ? t.search.nothingFor(q) : t.search.startWithWord}</p>
          <p className="mt-2 text-sm text-muted">{t.search.checkSpelling}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {NAV.map((c) => (
              <li key={c.id}>
                <Link href={P.category(c.id)} className="inline-flex h-9 items-center rounded-full border border-line bg-paper px-4 text-sm hover:border-ink/40">
                  {c.name[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      }
    />
  );
}
