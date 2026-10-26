"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import { DICT } from "./dict";

const Ctx = createContext<Locale>("bg");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useLocale(): Locale {
  return useContext(Ctx);
}

/** Interface texts in the current language. */
export function useT() {
  return DICT[useContext(Ctx)];
}
