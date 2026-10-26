"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { IconArrow } from "../Icons";

export type IndexRow = { id: string; href: string; name: string; count: number; subs: string[]; image?: string };

/**
 * Numbered category list. On desktop a framed product photo follows the row under the pointer;
 * it is decoration only (the rows are plain links and work the same without it).
 */
export function CategoryIndex({ rows }: { rows: IndexRow[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [y, setY] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  const follow = (i: number, el: HTMLElement) => {
    const list = listRef.current;
    if (!list) return;
    setActive(i);
    setY(el.offsetTop + el.offsetHeight / 2);
  };

  return (
    <div className="relative">
      <ol ref={listRef} className="border-t border-ink/15" onMouseLeave={() => setActive(null)}>
        {rows.map((r, i) => (
          <li key={r.id} onMouseEnter={(e) => follow(i, e.currentTarget)} className="border-b border-ink/15">
            <Link
              href={r.href}
              className="group grid grid-cols-[2.25rem_1fr_auto] items-center gap-x-4 py-5 sm:grid-cols-[3.5rem_1fr_auto] lg:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_auto] lg:py-6"
            >
              <span className="tabular text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-[1.9rem] leading-none font-semibold transition-[color,transform] duration-300 ease-out-strong group-hover:text-wine sm:text-[2.6rem] lg:text-[3.25rem] lg:group-hover:translate-x-2">
                {r.name}
              </span>
              <span className="hidden text-sm text-ink-2 lg:block">{r.subs.slice(0, 2).join(" · ")}</span>
              <span className="flex items-center gap-3 text-sm text-muted">
                <span className="tabular hidden sm:inline">{r.count}</span>
                <span className="grid size-10 place-items-center rounded-full border border-ink/15 transition-colors duration-200 group-hover:border-wine group-hover:bg-wine group-hover:text-white">
                  <IconArrow size={16} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <div
        className="index-preview pointer-events-none absolute top-0 right-[7.5rem] hidden w-40 xl:block"
        style={{ transform: `translateY(calc(${y}px - 50%))`, opacity: active === null ? 0 : 1 }}
        aria-hidden="true"
      >
        <div className="tile aspect-[4/5] rotate-[-3deg] shadow-[0_30px_60px_-30px_rgb(23_15_18/0.55)]">
          {rows.map((r, i) =>
            r.image ? (
              <Image
                key={r.id}
                src={r.image}
                alt=""
                fill
                sizes="160px"
                className="p-4 transition-opacity duration-200"
                style={{ opacity: active === i ? 1 : 0 }}
              />
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
