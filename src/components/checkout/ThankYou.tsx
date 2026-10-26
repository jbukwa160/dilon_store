"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { paths } from "@/i18n/paths";
import { price } from "@/lib/format";
import { SITE } from "@/lib/site";
import { IconCheck } from "../Icons";
import { LAST_ORDER_KEY } from "./CheckoutForm";

type Summary = { number: string; total: number; subtotal: number; shipping: number; email: string; delivery: string; emailSent: boolean };

export function ThankYou({ number }: { number: string }) {
  const locale = useLocale();
  const t = useT().thanks;
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) ?? "null") as Summary | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (s && s.number === number) setSummary(s);
    } catch {
      // The page still works with the number alone.
    }
  }, [number]);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-16 sm:px-8">
      <span className="reveal grid size-16 place-items-center rounded-full bg-moss text-white" style={{ "--i": 0 } as React.CSSProperties}>
        <IconCheck size={30} strokeWidth={2} />
      </span>
      <h1 className="reveal font-display mt-7 text-[2.75rem] leading-none font-semibold sm:text-[3.75rem]" style={{ "--i": 1 } as React.CSSProperties}>
        {t.title}
      </h1>
      <p className="reveal mt-4 text-[1.0625rem] text-ink-2" style={{ "--i": 2 } as React.CSSProperties}>
        {number ? t.accepted(number) : t.acceptedNoNumber} {summary?.emailSent ? t.emailSent(summary.email) : t.willContact}
      </p>

      {summary && (
        <dl className="reveal mt-8 divide-y divide-line border-y border-line text-sm" style={{ "--i": 3 } as React.CSSProperties}>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-ink-2">{t.delivery}</dt>
            <dd className="text-right">{summary.delivery}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-ink-2">{t.toPay}</dt>
            <dd className="tabular font-semibold">{price(summary.total, locale)}</dd>
          </div>
        </dl>
      )}

      <ol className="reveal mt-10 space-y-6" style={{ "--i": 4 } as React.CSSProperties}>
        {t.steps(SITE.hours[locale], SITE.parcelSender[locale]).map(([title, text], i) => (
          <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-3">
            <span className="font-display text-[1.75rem] leading-none text-wine">{i + 1}</span>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-ink-2">{text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href={paths(locale).home()} className="btn btn-wine">
          {t.home}
        </Link>
        <a href={`mailto:${SITE.email}?subject=${encodeURIComponent(t.emailSubject(number))}`} className="btn btn-line">
          {t.question}
        </a>
      </div>
    </div>
  );
}
