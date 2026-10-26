import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { AGE_SCRIPT, AgeGate, SHELL_INERT_SCRIPT } from "@/components/AgeGate";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/header/Header";
import { InlineScript } from "@/components/InlineScript";
import { RTA_LABEL } from "@/components/ParentalControls";
import { isLocale, locales, OG_LOCALE } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { SITE } from "@/lib/site";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = DICT[locale].meta;
  const name = locale === "bg" ? SITE.name : SITE.nameLatin;
  return {
    metadataBase: new URL(SITE.url),
    title: { default: t.title(name), template: `%s · ${name}` },
    description: t.description,
    openGraph: { type: "website", locale: OG_LOCALE[locale], siteName: name },
    // Adults-only labels: "rating: adult" keeps the shop out of SafeSearch results, and the RTA label
    // (rtalabel.org) lets parental-control software block the site automatically.
    other: { rating: "adult", RATING: RTA_LABEL },
  };
}

export const viewport: Viewport = {
  themeColor: "#f4eee7",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = DICT[locale];
  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <InlineScript html={AGE_SCRIPT} />
      </head>
      {/* Browser extensions often add attributes to <body>; that is not a real mismatch. */}
      <body suppressHydrationWarning>
        <LocaleProvider locale={locale}>
          <AgeGate />
          <CartProvider>
            <div id="shell" suppressHydrationWarning>
              <a href="#main" className="skip-link">
                {t.common.toContent}
              </a>
              <Header locale={locale} />
              <main id="main">{children}</main>
              <Footer locale={locale} />
            </div>
            <InlineScript html={SHELL_INERT_SCRIPT} />
            <CartDrawer />
          </CartProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
