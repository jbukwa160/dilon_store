import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { DICT } from "@/i18n/dict";
import { paths } from "@/i18n/paths";
import { NAV } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import { IconMail, IconPhone } from "./Icons";

export function Footer({ locale }: { locale: Locale }) {
  const t = DICT[locale];
  const P = paths(locale);
  const help = [
    { href: P.info("delivery"), label: t.info.delivery },
    { href: P.info("returns"), label: t.info.returns },
    { href: P.info("discretion"), label: t.info.discretion },
    { href: P.info("contact"), label: t.info.contact },
    { href: P.brands(), label: t.common.brands },
  ];
  const legal = [
    { href: P.info("terms"), label: t.info.terms },
    { href: P.info("privacy"), label: t.info.privacy },
    { href: P.info("cookies"), label: t.info.cookies },
    { href: P.info("parental-controls"), label: t.info.parental },
  ];
  return (
    <footer className="grain on-night mt-24 bg-night text-bone">
      <div className="mx-auto max-w-[82rem] px-4 pt-16 pb-10 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <p lang="bg" className="font-display text-[3.5rem] leading-none font-semibold italic text-blush">{SITE.wordmark}</p>
            <p className="mt-4 max-w-xs text-sm text-bone/70">{t.footer.about}</p>
            <ul className="mt-6 space-y-2 text-sm">
              <li>
                <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2.5 text-bone/85 hover:text-blush">
                  <IconPhone size={16} /> {SITE.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2.5 text-bone/85 hover:text-blush">
                  <IconMail size={16} /> {SITE.email}
                </a>
              </li>
              <li className="pl-6.5 text-bone/55">{SITE.hours[locale]}</li>
            </ul>
          </div>
          <FooterList title={t.footer.shop} links={NAV.map((c) => ({ href: P.category(c.id), label: c.name[locale] }))} />
          <FooterList title={t.footer.help} links={help} />
          <FooterList title={t.footer.legal} links={legal} />
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-bone/15 pt-6 text-xs text-bone/55 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.company.name[locale]}. {t.footer.adults}
          </p>
          <p>{t.footer.prices}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="eyebrow text-bone/50">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-bone/85 transition-colors duration-150 hover:text-blush">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
