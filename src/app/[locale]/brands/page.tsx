import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/listing/Listing";
import { isLocale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { alternates, paths } from "@/i18n/paths";
import { BRANDS } from "@/lib/catalog";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = DICT[locale];
  return { title: t.common.brands, description: t.meta.brandsDescription, alternates: alternates(locale, "/brands") };
}

export default async function BrandsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = DICT[locale];
  const P = paths(locale);
  const groups = new Map<string, typeof BRANDS>();
  for (const b of [...BRANDS].sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const letter = /^[a-z]/i.test(b.name) ? b.name[0].toUpperCase() : "#";
    groups.set(letter, [...(groups.get(letter) ?? []), b]);
  }
  const top = BRANDS.slice(0, 12);

  return (
    <div className="mx-auto max-w-[82rem] px-4 pt-6 sm:px-8">
      <Breadcrumbs locale={locale} items={[{ href: P.home(), label: t.common.home }, { label: t.common.brands }]} />
      <h1 className="font-display mt-6 text-[2.6rem] leading-none font-semibold sm:text-[3.5rem]">{t.common.brands}</h1>
      <p className="mt-3 max-w-2xl text-[1.0625rem] text-ink-2">{t.brandsPage.lede(BRANDS.length)}</p>

      <ul className="mt-10 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {top.map((b) => (
          <li key={b.slug}>
            <Link href={P.brand(b.slug)} className="font-display text-[2rem] leading-tight font-semibold transition-colors duration-150 hover:text-wine sm:text-[2.5rem]">
              {b.name}
              <sup className="tabular ml-1 font-sans text-xs font-normal text-muted">{b.count}</sup>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-16 columns-2 gap-10 sm:columns-3 lg:columns-5">
        {[...groups].map(([letter, list]) => (
          <section key={letter} className="mb-8 break-inside-avoid">
            <h2 className="font-display border-b border-line pb-1 text-2xl font-semibold text-wine">{letter}</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {list.map((b) => (
                <li key={b.slug}>
                  <Link href={P.brand(b.slug)} className="flex justify-between gap-3 hover:text-wine">
                    <span>{b.name}</span>
                    <span className="tabular text-xs text-muted">{b.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
