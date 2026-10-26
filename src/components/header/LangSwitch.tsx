"use client";

import { usePathname } from "next/navigation";
import { localePath, stripLocale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/LocaleProvider";

/** Link to the same page in the other language. The query string (filters, search) is kept. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const t = useT().common;
  const other = locale === "bg" ? "en" : "bg";
  const href = localePath(other, stripLocale(usePathname()));
  return (
    <a
      href={href}
      hrefLang={other}
      lang={other}
      className={className}
      title={t.otherLanguage}
      aria-label={t.otherLanguage}
      onClick={(e) => {
        if (window.location.search) {
          e.preventDefault();
          window.location.href = href + window.location.search;
        }
      }}
    >
      {t.otherLanguageShort}
    </a>
  );
}
