import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Breadcrumbs } from "@/components/listing/Listing";
import { isLocale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { paths } from "@/i18n/paths";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: DICT[locale].checkout.title, robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = DICT[locale];
  return (
    <div className="mx-auto max-w-[82rem] px-4 pt-6 sm:px-8">
      <Breadcrumbs locale={locale} items={[{ href: paths(locale).home(), label: t.common.home }, { label: t.checkout.title }]} />
      <h1 className="font-display mt-6 mb-10 text-[2.6rem] leading-none font-semibold sm:text-[3.5rem]">{t.checkout.title}</h1>
      <CheckoutForm />
    </div>
  );
}
