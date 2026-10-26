// Shop details shown on the site, in e-mails and on the legal pages.
// Everything in [square brackets] is a placeholder that must be replaced before going live.

import type { Locale } from "@/i18n/config";

type L = Record<Locale, string>;

export const SITE = {
  name: "Кадифе",
  nameLatin: "Kadife",
  wordmark: "кадифе",
  tagline: { bg: "интимен бутик", en: "intimate boutique" } as L,
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  email: "zdravei@kadife.bg",
  phone: "+359 88 000 0000",
  hours: { bg: "понеделник – петък, 9:00 – 18:00", en: "Monday – Friday, 9:00 – 18:00" } as L,
  company: {
    name: { bg: "[Име на фирмата] ЕООД", en: "[Company name] EOOD" } as L,
    eik: "[ЕИК]",
    vat: "[ДДС номер]",
    address: { bg: "[Седалище и адрес на управление]", en: "[Registered address]" } as L,
    manager: { bg: "[Управител]", en: "[Manager]" } as L,
  },
  /** Name printed as sender on the waybill. Neutral on purpose. */
  parcelSender: { bg: "КДФ Трейд", en: "KDF Trade" } as L,
};

export const SHIPPING = {
  /** Order total (with VAT) from which delivery is free. */
  freeFrom: 59,
  methods: [
    {
      id: "speedy-office",
      label: { bg: "До офис или автомат на Speedy", en: "To a Speedy office or locker" } as L,
      short: { bg: "Офис Speedy", en: "Speedy office" } as L,
      price: 3.49,
      needs: "office",
    },
    {
      id: "econt-office",
      label: { bg: "До офис или автомат на Еконт", en: "To an Econt office or locker" } as L,
      short: { bg: "Офис Еконт", en: "Econt office" } as L,
      price: 3.49,
      needs: "office",
    },
    {
      id: "address",
      label: { bg: "До адрес с куриер", en: "Courier to your address" } as L,
      short: { bg: "До адрес", en: "To your address" } as L,
      price: 4.99,
      needs: "address",
    },
  ],
  /** Working days from order to delivery. */
  days: "1–3",
} as const;

export type ShippingMethodId = (typeof SHIPPING.methods)[number]["id"];

export function shippingPrice(methodId: ShippingMethodId, subtotal: number): number {
  if (subtotal >= SHIPPING.freeFrom) return 0;
  return SHIPPING.methods.find((m) => m.id === methodId)?.price ?? SHIPPING.methods[0].price;
}

export const AGE_COOKIE = "kd_age";
export const CART_KEY = "kd_cart_v2";
