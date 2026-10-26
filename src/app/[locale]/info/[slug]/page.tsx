import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/listing/Listing";
import { getInfoPage, INFO_SLUGS } from "@/content/pages";
import { isLocale, locales } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { alternates, paths } from "@/i18n/paths";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => INFO_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const page = getInfoPage(slug, locale);
  if (!page) return {};
  return { title: page.title, description: page.description, alternates: alternates(locale, `/info/${slug}`) };
}

export default async function InfoPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const page = getInfoPage(slug, locale);
  if (!page) notFound();
  const t = DICT[locale];
  const P = paths(locale);
  const menu: [string, string][] = [
    ["delivery", t.info.delivery],
    ["returns", t.info.returns],
    ["discretion", t.info.discretion],
    ["contact", t.info.contact],
    ["terms", t.info.terms],
    ["privacy", t.info.privacy],
    ["cookies", t.info.cookies],
    ["parental-controls", t.info.parental],
  ];

  return (
    <div className="mx-auto max-w-[82rem] px-4 pt-6 sm:px-8">
      <Breadcrumbs locale={locale} items={[{ href: P.home(), label: t.common.home }, { label: page.title }]} />
      <div className="mt-6 grid gap-12 lg:grid-cols-[15rem_minmax(0,46rem)] lg:gap-20">
        <nav aria-label={t.info.menu} className="order-2 lg:order-1">
          <ul className="space-y-1 border-l border-line text-sm lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            {menu.map(([s, label]) => (
              <li key={s}>
                <Link
                  href={P.info(s)}
                  aria-current={s === slug ? "page" : undefined}
                  className={`-ml-px block border-l py-1.5 pl-4 transition-colors duration-150 ${s === slug ? "border-wine font-semibold text-wine" : "border-transparent text-ink-2 hover:text-ink"}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="order-1 lg:order-2">
          <h1 className="font-display text-[2.6rem] leading-none font-semibold sm:text-[3.5rem]">{page.title}</h1>
          <div className="prose-shop mt-8 text-[0.975rem] leading-relaxed">{page.body}</div>
        </article>
      </div>
    </div>
  );
}
