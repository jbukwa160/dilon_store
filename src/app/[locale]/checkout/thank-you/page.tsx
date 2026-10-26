import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThankYou } from "@/components/checkout/ThankYou";
import { isLocale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: DICT[locale].thanks.metaTitle, robots: { index: false, follow: false } };
}

export default async function ThankYouPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const number = (Array.isArray(sp.n) ? sp.n[0] : sp.n) ?? "";
  return <ThankYou number={/^KD-\d{6}-[A-Z0-9]{4}$/.test(number) ? number : ""} />;
}
