import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { paths } from "@/i18n/paths";
import { coverFor, NAV } from "@/lib/catalog";
import { priceShort } from "@/lib/format";
import { SHIPPING, SITE } from "@/lib/site";
import { AUDIENCES } from "@/lib/taxonomy";
import { CartButton } from "../cart/CartDrawer";
import { LangSwitch } from "./LangSwitch";
import { MegaNav, type NavItem } from "./MegaNav";
import { MobileMenu } from "./MobileMenu";
import { SearchBox } from "./SearchBox";

export function Header({ locale }: { locale: Locale }) {
  const t = DICT[locale];
  const P = paths(locale);
  const items: NavItem[] = NAV.map((c) => {
    const cover = coverFor(c.id);
    return {
      id: c.id,
      href: P.category(c.id),
      name: c.name[locale],
      short: (c.short ?? c.name)[locale],
      lede: c.lede[locale],
      count: c.count,
      subs: c.subs.map((s) => ({ id: s.id, href: P.category(c.id, s.id), name: s.name[locale], count: s.count })),
      cover: cover && { image: cover.image, name: cover.name[locale], href: P.product(cover.slug) },
    };
  });
  const audiences = AUDIENCES.map((a) => ({ id: a.id, href: P.audience(a.id), name: a.name[locale] }));
  const promo = t.header.promo(SHIPPING.days, priceShort(SHIPPING.freeFrom, locale));
  const links = [
    { href: P.brands(), label: t.common.allBrands },
    { href: P.info("delivery"), label: t.info.delivery },
    { href: P.info("discretion"), label: t.info.discretion },
    { href: P.info("contact"), label: t.info.contact },
  ];

  return (
    <>
      <div className="bg-night text-bone">
        <p className="mx-auto flex h-9 max-w-[82rem] items-center justify-center gap-x-5 px-4 text-center text-xs tracking-[0.02em] sm:px-8">
          <span>{promo[0]}</span>
          <span className="hidden text-bone/30 sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden sm:inline">{promo[1]}</span>
          <span className="hidden text-bone/30 md:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden md:inline">{promo[2]}</span>
        </p>
      </div>
      <header className="sticky top-0 z-50 border-b border-line bg-bone">
        <div className="mx-auto flex h-16 max-w-[82rem] items-center gap-3 px-4 sm:px-8 lg:gap-8">
          <MobileMenu items={items} audiences={audiences} links={links} />
          <Link href={P.home()} className="group flex items-baseline gap-2.5" aria-label={t.header.homeLabel(locale === "bg" ? SITE.name : SITE.nameLatin)}>
            <span lang="bg" className="font-display text-[2rem] leading-none font-semibold italic text-wine">{SITE.wordmark}</span>
            <span className="eyebrow hidden text-muted xl:inline">{SITE.tagline[locale]}</span>
          </Link>
          <SearchBox className="hidden flex-1 lg:block lg:max-w-xl" />
          <nav aria-label={t.header.forWhom} className="ml-auto hidden items-center gap-6 text-sm font-medium lg:flex">
            {audiences.map((a) => (
              <Link key={a.id} href={a.href} className="transition-colors duration-150 hover:text-wine">
                {a.name}
              </Link>
            ))}
            <Link href={P.category("couples")} className="transition-colors duration-150 hover:text-wine">
              {NAV.find((c) => c.id === "couples")?.name[locale]}
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <LangSwitch className="grid h-9 min-w-9 place-items-center rounded-full border border-line px-2 text-xs font-semibold tracking-wide transition-colors duration-150 hover:border-ink" />
            <CartButton />
          </div>
        </div>
        <div className="px-4 pb-3 sm:px-8 lg:hidden">
          <SearchBox />
        </div>
        <MegaNav items={items} brandsHref={P.brands()} />
      </header>
    </>
  );
}
