"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/LocaleProvider";
import { SITE } from "@/lib/site";
import { IconChevron, IconClose, IconMenu } from "../Icons";
import { useDialog } from "../useDialog";
import { LangSwitch } from "./LangSwitch";
import type { NavItem } from "./MegaNav";

export function MobileMenu({
  items,
  audiences,
  links,
}: {
  items: NavItem[];
  audiences: { id: string; href: string; name: string }[];
  links: { href: string; label: string }[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(open, () => setOpen(false), panelRef);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button type="button" className="icon-btn -ml-2 lg:hidden" onClick={() => setOpen(true)} aria-label={t.header.openMenu} aria-expanded={open}>
        <IconMenu size={22} />
      </button>
      <div className="backdrop lg:hidden" data-open={open} onClick={() => setOpen(false)} aria-hidden="true" />
      <div ref={panelRef} className="drawer drawer-left lg:hidden" data-open={open} role="dialog" aria-modal="true" aria-label={t.header.menu} aria-hidden={!open} inert={!open}>
        <div className="flex items-center justify-between px-5 py-4">
          <span lang="bg" className="font-display text-[1.75rem] leading-none italic text-wine">{SITE.wordmark}</span>
          <div className="flex items-center gap-1">
            <LangSwitch className="grid h-9 min-w-9 place-items-center rounded-full border border-line px-2 text-xs font-semibold tracking-wide" />
            <button type="button" className="icon-btn -mr-2" onClick={() => setOpen(false)} aria-label={t.header.closeMenu} data-autofocus>
              <IconClose />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
          <div className="grid grid-cols-2 gap-2">
            {audiences.map((a) => (
              <Link key={a.id} href={a.href} className="rounded-full border border-line py-2.5 text-center text-sm font-medium">
                {a.name}
              </Link>
            ))}
          </div>
          <ul className="mt-6 border-t border-line">
            {items.map((item) => {
              const isOpen = expanded === item.id;
              return (
                <li key={item.id} className="border-b border-line">
                  <div className="flex items-center">
                    <Link href={item.href} className="flex-1 py-3.5 font-display text-[1.375rem] leading-tight font-semibold">
                      {item.name}
                    </Link>
                    <button
                      type="button"
                      className="icon-btn -mr-2 text-muted"
                      onClick={() => setExpanded(isOpen ? null : item.id)}
                      aria-expanded={isOpen}
                      aria-controls={`m-${item.id}`}
                      aria-label={t.header.subcategoriesOf(item.name)}
                    >
                      <IconChevron size={18} className={`transition-transform duration-200 ease-out-strong ${isOpen ? "rotate-90" : ""}`} />
                    </button>
                  </div>
                  <div id={`m-${item.id}`} className={`grid transition-[grid-template-rows] duration-300 ease-out-strong ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <ul className="overflow-hidden" inert={!isOpen}>
                      {item.subs.map((s) => (
                        <li key={s.id}>
                          <Link href={s.href} className="flex justify-between gap-3 py-2 pl-3 text-[0.9375rem] text-ink-2">
                            {s.name}
                            <span className="tabular text-xs text-muted">{s.count}</span>
                          </Link>
                        </li>
                      ))}
                      <li className="pb-3" />
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
          <ul className="mt-6 space-y-2.5 text-sm text-ink-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
