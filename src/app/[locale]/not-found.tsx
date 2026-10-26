"use client";

import Link from "next/link";
import { useLocale, useT } from "@/i18n/LocaleProvider";
import { paths } from "@/i18n/paths";

export default function NotFound() {
  const t = useT().notFound;
  const P = paths(useLocale());
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-24 pb-8 text-center">
      <p className="font-display text-[7rem] leading-none font-semibold italic text-wine">404</p>
      <h1 className="font-display mt-4 text-[2.25rem] leading-tight font-semibold">{t.title}</h1>
      <p className="mt-3 text-ink-2">{t.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={P.home()} className="btn btn-wine">
          {t.home}
        </Link>
        <Link href={P.search()} className="btn btn-line">
          {t.search}
        </Link>
      </div>
    </div>
  );
}
