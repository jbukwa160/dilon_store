"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { stripLocale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { count } from "@/lib/format";
import { IconArrow } from "../Icons";

export type NavItem = {
  id: string;
  href: string;
  name: string;
  short: string;
  lede: string;
  count: number;
  subs: { id: string; href: string; name: string; count: number }[];
  cover?: { image: string; name: string; href: string };
};

const OPEN_DELAY = 110;
const CLOSE_DELAY = 140;

/**
 * Desktop category bar with drop-down panels. Opening waits a moment (so sweeping the mouse across the bar does
 * not flash panels); once a panel is open, moving to the next category switches instantly with no animation.
 */
export function MegaNav({ items, brandsHref }: { items: NavItem[]; brandsHref: string }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState<string | null>(null);
  const [instant, setInstant] = useState(false);
  const timer = useRef<number>(undefined);
  const pathname = usePathname();
  const current = stripLocale(pathname);

  useEffect(() => {
    // A navigation happened: close the panel.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(null);
  }, [pathname]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = (id: string) => {
    window.clearTimeout(timer.current);
    if (open) {
      setInstant(true);
      setOpen(id);
      return;
    }
    timer.current = window.setTimeout(() => {
      setInstant(false);
      setOpen(id);
    }, OPEN_DELAY);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setInstant(false);
      setOpen(null);
    }, CLOSE_DELAY);
  };

  return (
    <nav aria-label={t.header.categories} className="relative hidden border-t border-line lg:block" onMouseLeave={hide} onKeyDown={(e) => e.key === "Escape" && setOpen(null)}>
      <ul className="mx-auto flex max-w-[82rem] items-stretch justify-between gap-2 px-8">
        {items.map((item) => {
          const isOpen = open === item.id;
          const active = current === `/category/${item.id}` || current.startsWith(`/category/${item.id}/`);
          return (
            <li key={item.id} className="flex" onMouseEnter={() => show(item.id)}>
              <Link
                href={item.href}
                className={`relative flex h-11 items-center px-0.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-150 hover:text-wine ${active ? "text-wine" : "text-ink"}`}
                aria-expanded={isOpen}
                aria-controls={`mega-${item.id}`}
                onFocus={() => {
                  if (open) setOpen(item.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setInstant(true);
                    setOpen(item.id);
                    requestAnimationFrame(() => document.querySelector<HTMLElement>(`#mega-${item.id} a`)?.focus());
                  }
                }}
              >
                <span className="xl:hidden">{item.short}</span>
                <span className="hidden xl:inline">{item.name}</span>
                <span
                  className={`absolute inset-x-0.5 bottom-0 h-px origin-left bg-wine transition-transform duration-300 ease-out-strong ${isOpen || active ? "scale-x-100" : "scale-x-0"}`}
                  aria-hidden="true"
                />
              </Link>
              <div
                id={`mega-${item.id}`}
                className="mega z-40 border-y border-line bg-paper shadow-[0_30px_60px_-40px_rgb(23_15_18/0.5)]"
                data-open={isOpen}
                data-instant={instant}
                onMouseEnter={() => window.clearTimeout(timer.current)}
              >
                <div className="mx-auto grid max-w-[82rem] grid-cols-[1fr_2fr_14rem] gap-12 px-8 py-9">
                  <div>
                    <p className="eyebrow text-muted">{t.listing.countProducts(count(item.count, locale))}</p>
                    <p className="mt-2 font-display text-[2rem] leading-tight font-semibold">{item.name}</p>
                    <p className="mt-3 text-sm text-ink-2">{item.lede}</p>
                    <Link href={item.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-wine" tabIndex={isOpen ? 0 : -1}>
                      {t.common.seeAll} <IconArrow size={16} />
                    </Link>
                  </div>
                  <ul className="grid grid-cols-2 content-start gap-x-10">
                    {item.subs.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={s.href}
                          className="group flex items-baseline justify-between gap-3 border-b border-line py-2.5 text-[0.9375rem] transition-colors duration-150 hover:text-wine"
                          tabIndex={isOpen ? 0 : -1}
                        >
                          <span>{s.name}</span>
                          <span className="tabular text-xs text-muted group-hover:text-wine">{s.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {item.cover && (
                    <Link href={item.cover.href} className="group block" tabIndex={isOpen ? 0 : -1}>
                      <div className="tile aspect-square">
                        <Image src={item.cover.image} alt="" fill sizes="224px" className="p-6" />
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-muted group-hover:text-wine">{item.cover.name}</p>
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        <li className="flex">
          <Link href={brandsHref} className="flex h-11 items-center px-0.5 text-[0.8125rem] font-medium whitespace-nowrap text-ink-2 transition-colors duration-150 hover:text-wine">
            {t.common.brands}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
