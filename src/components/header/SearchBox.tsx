"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { paths } from "@/i18n/paths";
import { price } from "@/lib/format";
import type { CardProduct } from "@/lib/types";
import { IconArrow, IconClose, IconSearch } from "../Icons";

type Suggestions = { products: CardProduct[]; categories: { href: string; label: string; count: number }[]; total: number };

/** Search field with live suggestions (ARIA combobox). Enter without a highlighted item opens the full results. */
export function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useT().search;
  const P = paths(locale);
  const id = useId();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const term = q.trim();
  useEffect(() => {
    if (term.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}&locale=${locale}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d: Suggestions) => {
          setData(d);
          setActive(-1);
        })
        .catch(() => {});
    }, 140);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [term, locale]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const options: { href: string; key: string }[] = [
    ...(data?.categories.map((c) => ({ href: c.href, key: c.href })) ?? []),
    ...(data?.products.map((p) => ({ href: P.product(p.slug), key: p.sku })) ?? []),
  ];

  const go = (href: string) => {
    setOpen(false);
    inputRef.current?.blur();
    router.push(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && options[active]) return go(options[active].href);
    if (term) go(P.search(term));
  };

  const showPanel = open && (term.length < 2 || data !== null);
  const listId = `${id}-list`;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form role="search" onSubmit={submit} action={P.search()}>
        <label htmlFor={`${id}-q`} className="sr-only">
          {t.label}
        </label>
        <div className="flex h-11 items-center rounded-full border border-line bg-paper pr-1.5 pl-4 transition-[border-color,box-shadow] duration-150 focus-within:border-ink/40 focus-within:shadow-[0_0_0_4px_rgb(109_26_42/0.08)]">
          <IconSearch size={18} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            id={`${id}-q`}
            name="q"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && options.length) {
                e.preventDefault();
                setOpen(true);
                setActive((a) => (a + 1) % options.length);
              } else if (e.key === "ArrowUp" && options.length) {
                e.preventDefault();
                setActive((a) => (a <= 0 ? options.length - 1 : a - 1));
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder={t.placeholder}
            autoComplete="off"
            enterKeyHint="search"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-[0.9375rem] outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              className="grid size-8 place-items-center rounded-full text-muted hover:text-ink"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              aria-label={t.clear}
            >
              <IconClose size={16} />
            </button>
          )}
        </div>
      </form>

      <div
        id={listId}
        role="listbox"
        aria-label={t.suggestions}
        className={`absolute top-[calc(100%+0.5rem)] right-0 left-0 z-50 origin-top overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_24px_60px_-28px_rgb(23_15_18/0.45)] transition-[opacity,transform] duration-150 ease-out-strong ${
          showPanel ? "visible scale-100 opacity-100" : "invisible scale-[0.98] opacity-0"
        }`}
      >
        {term.length < 2 ? (
          <div className="p-4">
            <p className="eyebrow text-muted">{t.popular}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {t.quick.map((w) => (
                <button
                  key={w}
                  type="button"
                  tabIndex={-1}
                  className="rounded-full border border-line px-3 py-1.5 text-sm transition-colors duration-150 hover:border-ink hover:bg-ink hover:text-bone"
                  onClick={() => go(P.search(w))}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        ) : data && options.length === 0 ? (
          <p className="p-5 text-sm text-ink-2">
            {t.noResults(term)}{" "}
            <button type="button" className="link-underline text-wine" onClick={() => go(P.category("vibrators"))}>
              {t.browse}
            </button>
            .
          </p>
        ) : (
          data && (
            <div className="max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain py-2">
              {data.categories.map((c, i) => (
                <a
                  key={c.href}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={active === i}
                  href={c.href}
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    go(c.href);
                  }}
                  className={`flex items-center justify-between px-4 py-2 text-sm ${active === i ? "bg-sand" : "hover:bg-sand/60"}`}
                >
                  <span>
                    <span className="text-muted">{t.categoryPrefix}</span>
                    {c.label}
                  </span>
                  <span className="tabular text-xs text-muted">{c.count}</span>
                </a>
              ))}
              {data.products.map((p, j) => {
                const i = j + data.categories.length;
                return (
                  <a
                    key={p.sku}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={active === i}
                    href={P.product(p.slug)}
                    tabIndex={-1}
                    onClick={(e) => {
                      e.preventDefault();
                      go(P.product(p.slug));
                    }}
                    className={`flex items-center gap-3 px-4 py-2 ${active === i ? "bg-sand" : "hover:bg-sand/60"}`}
                  >
                    <span className="tile relative size-12 shrink-0">
                      <Image src={p.image} alt="" fill sizes="48px" className="p-1.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm">{p.name[locale]}</span>
                      <span className="text-xs text-muted">{p.brand || " "}</span>
                    </span>
                    <span className="tabular text-sm font-semibold">{price(p.price, locale)}</span>
                  </a>
                );
              })}
              <button
                type="button"
                tabIndex={-1}
                className="mt-1 flex w-full items-center justify-between border-t border-line px-4 pt-3 pb-2 text-sm font-semibold text-wine"
                onClick={() => go(P.search(term))}
              >
                {t.allResults(data.total)} <IconArrow size={16} />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
