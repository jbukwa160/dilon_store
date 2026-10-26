import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIndex } from "@/components/home/CategoryIndex";
import { Parcel } from "@/components/home/Parcel";
import { IconArrow, IconBox, IconCash, IconLock, IconTruck } from "@/components/Icons";
import { ProductGrid } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { isLocale, type Locale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { alternates, paths } from "@/i18n/paths";
import { allProducts, BRANDS, COUNTS, coverFor, featured, NAV, newest, productCount } from "@/lib/catalog";
import { count, price, priceShort } from "@/lib/format";
import { SHIPPING, SITE } from "@/lib/site";
import { AUDIENCES, CATEGORY_BY_ID } from "@/lib/taxonomy";
import type { Product } from "@/lib/types";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { alternates: alternates(locale, "/") } : {};
}

/** Three photos for the hero: first in-stock product with a clean supplier photo from each slot. */
function heroPicks(): Product[] {
  const slots = [
    (p: Product) => p.category === "vibrators" && p.sub === "air-pulse",
    (p: Product) => p.category === "masturbators" && p.brand === "Tenga",
    (p: Product) => p.category === "vibrators" && p.sub === "rabbit-vibrators",
  ];
  return slots
    .map((match) => allProducts().find((p) => match(p) && p.stock > 0 && p.image.includes("sexwellshop.com")))
    .filter((p): p is Product => p !== undefined);
}

function faq(locale: Locale): { q: string; a: React.ReactNode }[] {
  const P = paths(locale);
  const office = price(SHIPPING.methods[0].price, locale);
  const address = price(SHIPPING.methods[2].price, locale);
  const free = priceShort(SHIPPING.freeFrom, locale);
  const link = (href: string, label: string) => (
    <Link href={href} className="link-underline text-wine">
      {label}
    </Link>
  );
  if (locale === "en") {
    return [
      {
        q: "What does the parcel look like?",
        a: `Like any other parcel: a plain brown box with no logo, pictures or labels. The sender on the waybill is “${SITE.parcelSender.en}”, and the contents description gives nothing away.`,
      },
      { q: "How do I pay?", a: "Cash on delivery — you pay the courier when the parcel arrives. No account and no card details needed." },
      {
        q: "How much is delivery?",
        a: `${office} to a Speedy or Econt office or locker, ${address} to your address. Delivery is free for orders over ${free}.`,
      },
      {
        q: "Can I return a product?",
        a: (
          <>
            Yes, within 14 days, if the packaging has not been opened. Opened intimate products, lingerie and cosmetics cannot be returned for hygiene
            reasons — that is the law in Bulgaria. {link(P.info("returns"), "How returns work")}
          </>
        ),
      },
      {
        q: "Which lubricant should I use with a silicone toy?",
        a: "A water-based one. Silicone lubricants can damage the surface of silicone toys, and oils damage latex condoms.",
      },
      {
        q: "Who can see what I ordered?",
        a: (
          <>
            Only the people who process your order. The courier sees a name, phone number, address and the amount to collect. We do not sell or share
            data with advertising networks. {link(P.info("privacy"), "Privacy policy")}
          </>
        ),
      },
    ];
  }
  return [
    {
      q: "Как изглежда пратката?",
      a: `Като всяка друга: обикновен кафяв кашон без лого, снимки или надписи. На товарителницата подател е „${SITE.parcelSender.bg}“, а в описанието на съдържанието не пише нищо, което да подсказва какво има вътре.`,
    },
    { q: "Как се плаща?", a: "С наложен платеж — плащате на куриера, когато получите пратката. Не е нужна регистрация, нито данни за карта." },
    {
      q: "Колко струва доставката?",
      a: `${office} до офис или автомат на Speedy или Еконт, ${address} до адрес. При поръчка над ${free} доставката е безплатна.`,
    },
    {
      q: "Мога ли да върна продукт?",
      a: (
        <>
          Да, в 14-дневен срок, ако опаковката не е отваряна. Отворените интимни продукти, бельото и козметиката не се връщат заради хигиената — така е
          по Закона за защита на потребителите. {link(P.info("returns"), "Как се връща")}
        </>
      ),
    },
    {
      q: "Какъв лубрикант да взема за силиконова играчка?",
      a: "На водна основа. Силиконовите лубриканти могат да увредят повърхността на силиконовите играчки, а маслата — латексовите презервативи.",
    },
    {
      q: "Кой вижда какво съм поръчал?",
      a: (
        <>
          Само хората, които обработват поръчката. Куриерът вижда име, телефон, адрес и сума за плащане. Не продаваме и не споделяме данни с рекламни
          мрежи. {link(P.info("privacy"), "Политика за поверителност")}
        </>
      ),
    },
  ];
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = DICT[locale];
  const P = paths(locale);
  const hero = heroPicks();
  const picks = featured(8, { perBrand: 1, withSupplierPhoto: true }).filter((p) => !hero.some((h) => h.sku === p.sku));
  const fresh = newest(24)
    .filter((p) => !picks.some((x) => x.sku === p.sku) && !hero.some((h) => h.sku === p.sku))
    .slice(0, 8);
  const brandCount = BRANDS.length;
  const indexRows = NAV.map((c) => ({
    id: c.id,
    href: P.category(c.id),
    name: c.name[locale],
    count: c.count,
    subs: c.subs.map((s) => s.name[locale]),
    image: coverFor(c.id)?.image,
  }));
  const forWhom = [
    ...AUDIENCES.map((a) => ({ href: P.audience(a.id), name: a.name[locale], lede: a.lede[locale], count: COUNTS.get(`for/${a.id}`) ?? 0 })),
    (() => {
      const c = CATEGORY_BY_ID.get("couples")!;
      return { href: P.category(c.id), name: c.name[locale], lede: c.lede[locale], count: COUNTS.get(c.id) ?? 0 };
    })(),
  ];
  const free = priceShort(SHIPPING.freeFrom, locale);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: locale === "bg" ? SITE.name : SITE.nameLatin,
    url: `${SITE.url}${P.home()}`,
    inLanguage: locale,
    potentialAction: { "@type": "SearchAction", target: `${SITE.url}${P.search()}?q={query}`, "query-input": "required name=query" },
  };
  const promiseIcons = [IconBox, IconTruck, IconCash, IconLock];
  const reveal = (i: number) => ({ "--i": i }) as React.CSSProperties;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Hero ── */}
      <section className="grain on-night overflow-hidden bg-night text-bone">
        <div className="mx-auto grid max-w-[82rem] items-center gap-12 px-4 pt-14 pb-16 sm:px-8 lg:min-h-[min(46rem,calc(100dvh-9rem))] lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <p className="reveal eyebrow text-blush" style={reveal(0)}>
              {t.home.eyebrow}
            </p>
            <h1 className="reveal font-display mt-5 text-[3.4rem] leading-[0.95] font-semibold sm:text-[5rem] lg:text-[6.25rem]" style={reveal(1)}>
              {t.home.titleA}
              <br />
              {t.home.titleB} <em className="font-medium text-blush">{t.home.titleEm}</em>
            </h1>
            <p className="reveal mt-7 max-w-[34rem] text-[1.0625rem] leading-relaxed text-bone/75" style={reveal(2)}>
              {t.home.lede(count(productCount, locale), brandCount - 4)}
            </p>
            <div className="reveal mt-9 flex flex-wrap gap-3" style={reveal(3)}>
              <Link href={P.category("vibrators")} className="btn btn-blush">
                {t.home.cta} <IconArrow size={18} />
              </Link>
              <Link href="#discretion" className="btn btn-ghost-night">
                {t.home.discreetCta}
              </Link>
            </div>
          </div>

          {hero.length === 3 && (
            <div className="relative mx-auto grid w-full max-w-[34rem] grid-cols-2 gap-4 sm:gap-5" aria-label={t.home.featured}>
              {hero.map((p, i) => (
                <Link key={p.sku} href={P.product(p.slug)} className={`reveal group block ${i === 0 ? "row-span-2 self-center" : ""}`} style={reveal(3 + i)}>
                  <ProductImage
                    src={p.image}
                    alt={p.name[locale]}
                    sizes="(min-width: 1024px) 270px, 45vw"
                    eager
                    highPriority={i === 0}
                    className={`rounded-lg ${i === 0 ? "aspect-[3/4]! bg-blush-2" : "bg-sand"}`}
                  />
                  <p className="mt-2.5 flex items-baseline justify-between gap-3 text-xs">
                    <span className="line-clamp-1 text-bone/70 transition-colors duration-150 group-hover:text-blush">{p.name[locale]}</span>
                    <span className="tabular shrink-0 font-semibold">{price(p.price, locale)}</span>
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Promises ── */}
      <section className="border-b border-line" aria-label={t.home.promises}>
        <ul className="mx-auto grid max-w-[82rem] grid-cols-2 gap-x-6 gap-y-6 px-4 py-8 sm:px-8 lg:grid-cols-4">
          {t.home.promise(SHIPPING.days, free).map(({ title, text }, i) => {
            const Icon = promiseIcons[i];
            return (
              <li key={title} className="flex gap-3.5">
                <Icon size={24} className="mt-0.5 shrink-0 text-wine" />
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted sm:text-sm">{text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Picks ── */}
      <section className="mx-auto max-w-[82rem] px-4 pt-20 sm:px-8" aria-labelledby="picks">
        <SectionHead id="picks" eyebrow={t.home.picksEyebrow} title={t.home.picksTitle} href={P.audience("her")} link={t.home.picksLink} />
        <ProductGrid products={picks.slice(0, 8)} locale={locale} />
      </section>

      {/* ── Category index ── */}
      <section className="mx-auto max-w-[82rem] px-4 pt-28 sm:px-8" aria-labelledby="catalog">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-wine">{t.home.catalogEyebrow}</p>
            <h2 id="catalog" className="font-display mt-2 text-[2.4rem] leading-none font-semibold sm:text-[3.25rem]">
              {t.home.catalogTitle}
            </h2>
          </div>
          <p className="max-w-sm text-sm text-ink-2">{t.home.catalogText(count(productCount, locale), NAV.length)}</p>
        </div>
        <CategoryIndex rows={indexRows} />
      </section>

      {/* ── For whom ── */}
      <section className="grain on-night mt-28 bg-wine text-bone" aria-labelledby="for-whom">
        <div className="mx-auto max-w-[82rem] px-4 py-20 sm:px-8">
          <h2 id="for-whom" className="font-display text-[2.4rem] leading-none font-semibold sm:text-[3.25rem]">
            {t.home.forWhom}
          </h2>
          <ul className="mt-12 grid divide-y divide-bone/20 border-y border-bone/20 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {forWhom.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="group flex h-full flex-col py-8 lg:px-8 lg:py-10 lg:first:pl-0">
                  <span className="font-display text-[2.75rem] leading-none font-semibold italic text-blush sm:text-[3.5rem]">{a.name}</span>
                  <span className="mt-4 max-w-xs text-sm leading-relaxed text-bone/80">{a.lede}</span>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
                    <span className="tabular">{t.listing.countProducts(count(a.count, locale))}</span>
                    <IconArrow size={16} className="transition-transform duration-300 ease-out-strong group-hover:translate-x-1.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Discretion ── */}
      <section
        id="discretion"
        className="mx-auto grid max-w-[82rem] items-center gap-12 px-4 pt-28 sm:px-8 lg:grid-cols-2 lg:gap-20"
        aria-labelledby="discreet"
      >
        <div className="order-2 mx-auto w-full max-w-lg lg:order-1">
          <Parcel locale={locale} />
        </div>
        <div className="order-1 lg:order-2">
          <p className="eyebrow text-wine">{t.home.discreetEyebrow}</p>
          <h2 id="discreet" className="font-display mt-2 text-[2.4rem] leading-[1.02] font-semibold sm:text-[3.25rem]">
            {t.home.discreetTitle}
            <br />
            <em className="font-medium text-wine">{t.home.discreetEm}</em>
          </h2>
          <ol className="mt-10 space-y-7">
            {t.home.discreetPoints(SITE.parcelSender[locale]).map(([title, text], i) => (
              <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-3">
                <span className="font-display text-[1.75rem] leading-none text-wine">{i + 1}</span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link href={P.info("discretion")} className="link-underline mt-9 inline-block text-sm font-semibold">
            {t.home.discreetLink}
          </Link>
        </div>
      </section>

      {/* ── New ── */}
      {fresh.length > 0 && (
        <section className="mx-auto max-w-[82rem] px-4 pt-28 sm:px-8" aria-labelledby="new">
          <SectionHead id="new" eyebrow={t.home.newEyebrow} title={t.home.newTitle} />
          <ProductGrid products={fresh} locale={locale} />
        </section>
      )}

      {/* ── Brands ── */}
      <section className="mx-auto max-w-[82rem] px-4 pt-28 sm:px-8" aria-labelledby="brands">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <h2 id="brands" className="font-display text-[2.4rem] leading-none font-semibold sm:text-[3.25rem]">
            {t.home.brandsTitle(brandCount)}
          </h2>
          <Link href={P.brands()} className="link-underline text-sm font-medium">
            {t.common.allBrands}
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-1 sm:gap-x-10">
          {BRANDS.slice(0, 20).map((b, i) => (
            <li key={b.slug}>
              <Link
                href={P.brand(b.slug)}
                className={`font-display text-[1.75rem] leading-snug font-medium transition-colors duration-150 hover:text-wine sm:text-[2.25rem] ${i % 3 === 1 ? "italic text-wine" : ""}`}
              >
                {b.name}
                <sup className="tabular ml-1 font-sans text-[0.6875rem] font-normal not-italic text-muted">{b.count}</sup>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto grid max-w-[82rem] gap-10 px-4 pt-28 sm:px-8 lg:grid-cols-[1fr_1.6fr]" aria-labelledby="faq">
        <div>
          <p className="eyebrow text-wine">{t.home.faqEyebrow}</p>
          <h2 id="faq" className="font-display mt-2 text-[2.4rem] leading-none font-semibold sm:text-[3.25rem]">
            {t.home.faqTitle}
          </h2>
          <p className="mt-4 max-w-xs text-sm text-ink-2">
            {t.home.faqText}{" "}
            <a href={`mailto:${SITE.email}`} className="link-underline text-wine">
              {SITE.email}
            </a>
            .
          </p>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {faq(locale).map((f) => (
            <details key={f.q} className="accordion">
              <summary className="flex items-center justify-between gap-6 py-5 text-[1.0625rem] font-medium">
                {f.q}
                <span className="plus text-2xl leading-none font-light text-muted" aria-hidden="true">
                  +
                </span>
              </summary>
              <div className="panel max-w-2xl pb-6 text-[0.9375rem] leading-relaxed text-ink-2">{f.a}</div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

function SectionHead({ id, eyebrow, title, href, link }: { id: string; eyebrow: string; title: string; href?: string; link?: string }) {
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-wine">{eyebrow}</p>
        <h2 id={id} className="font-display mt-2 text-[2.4rem] leading-none font-semibold sm:text-[3.25rem]">
          {title}
        </h2>
      </div>
      {href && link && (
        <Link href={href} className="link-underline text-sm font-medium">
          {link}
        </Link>
      )}
    </div>
  );
}
