import "server-only";
import { randomInt } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { z } from "zod";
import { isLocale, type Locale } from "@/i18n/config";
import { getBySku } from "./catalog";
import { price } from "./format";
import { SHIPPING, shippingPrice, SITE, type ShippingMethodId } from "./site";

const METHOD_IDS = SHIPPING.methods.map((m) => m.id) as [ShippingMethodId, ...ShippingMethodId[]];

const MESSAGES = {
  bg: {
    name: "Въведете име и фамилия",
    tooLong: "Текстът е твърде дълъг",
    phone: "Въведете български телефонен номер, напр. 0888 123 456",
    email: "Въведете валиден имейл",
    method: "Изберете начин на доставка",
    city: "Въведете населено място",
    note: "Бележката е до 500 знака",
    qty: "До 20 бройки от продукт",
    empty: "Количката е празна",
    terms: "Нужно е да приемете общите условия",
    adult: "Нужно е да потвърдите, че сте навършили 18 години",
    office: "Въведете офис или автомат (име или адрес)",
    address: "Въведете улица, номер, блок, вход, етаж",
    postcode: "Пощенският код е 4 цифри",
    required: "Попълнете това поле",
    check: "Моля, проверете отбелязаните полета.",
    busy: "Твърде много опити. Опитайте отново след няколко минути или ни се обадете.",
    invalid: "Невалидна заявка.",
    failed: "Поръчката не беше записана поради техническа грешка. Опитайте отново или ни се обадете.",
    gone: "Един от продуктите вече не се предлага. Премахнете го от количката.",
  },
  en: {
    name: "Enter your first and last name",
    tooLong: "This text is too long",
    phone: "Enter a Bulgarian phone number, e.g. 0888 123 456",
    email: "Enter a valid email address",
    method: "Choose a delivery method",
    city: "Enter your town or city",
    note: "The note can be up to 500 characters",
    qty: "Up to 20 units per product",
    empty: "Your cart is empty",
    terms: "Please accept the terms and conditions",
    adult: "Please confirm that you are 18 or older",
    office: "Enter the office or locker (name or address)",
    address: "Enter street, number, block, entrance, floor",
    postcode: "The postcode has 4 digits",
    required: "Please fill in this field",
    check: "Please check the highlighted fields.",
    busy: "Too many attempts. Please try again in a few minutes or call us.",
    invalid: "Invalid request.",
    failed: "The order could not be saved because of a technical error. Please try again or call us.",
    gone: "One of the products is no longer available. Please remove it from your cart.",
  },
} satisfies Record<Locale, Record<string, string>>;

const STOCK = {
  bg: {
    only: (name: string, n: number) => `„${name}“: налични са само ${n} бр.`,
    soldOut: (name: string) => `„${name}“ вече е изчерпан.`,
  },
  en: {
    only: (name: string, n: number) => `“${name}”: only ${n} left.`,
    soldOut: (name: string) => `“${name}” is now sold out.`,
  },
};

export function orderMessages(locale: Locale) {
  return MESSAGES[locale];
}

/** True for messages written by us (zod's own default messages are English and technical). */
export function isOwnMessage(message: string, locale: Locale): boolean {
  return (Object.values(MESSAGES[locale]) as string[]).includes(message);
}

/** The language the customer ordered in (sent by the checkout form). Bulgarian when missing. */
export function orderLocale(body: unknown): Locale {
  const value = typeof body === "object" && body ? (body as Record<string, unknown>).locale : undefined;
  return isLocale(value) ? value : "bg";
}

export function orderSchema(locale: Locale) {
  const m = MESSAGES[locale];
  const text = (min: number, max: number, message: string) => z.string().trim().min(min, message).max(max, m.tooLong);
  return z
    .object({
      locale: z.enum(["bg", "en"]).optional().default("bg"),
      name: text(3, 80, m.name).refine((v) => v.split(/\s+/).length >= 2, m.name),
      phone: z
        .string()
        .transform((v) => v.replace(/[\s\-().]/g, ""))
        .pipe(z.string().regex(/^(?:\+359|00359|0)\d{8,9}$/, m.phone)),
      email: z.string().trim().max(120).pipe(z.email(m.email)),
      method: z.enum(METHOD_IDS, m.method),
      city: text(2, 60, m.city),
      postcode: z.string().trim().max(4).optional().default(""),
      office: z.string().trim().max(160).optional().default(""),
      address: z.string().trim().max(160).optional().default(""),
      note: z.string().trim().max(500, m.note).optional().default(""),
      items: z
        .array(z.object({ sku: z.string().max(80), qty: z.number().int().min(1).max(20, m.qty) }))
        .min(1, m.empty)
        .max(50),
      terms: z.literal(true, m.terms),
      adult: z.literal(true, m.adult),
      /** Honeypot: hidden from people, bots fill it in. */
      website: z.string().max(0).optional().default(""),
    })
    .superRefine((o, ctx) => {
      for (const [field, message] of Object.entries(deliveryIssues(o, locale))) ctx.addIssue({ code: "custom", path: [field], message });
    });
}

/**
 * Office / address checks depend on the chosen method. Kept separate so the API can report them together with the
 * other field errors (zod skips refinements while any other field is invalid).
 */
export function deliveryIssues(o: Record<string, unknown>, locale: Locale): Record<string, string> {
  const m = MESSAGES[locale];
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const needs = SHIPPING.methods.find((x) => x.id === o.method)?.needs;
  const issues: Record<string, string> = {};
  if (needs === "office" && str(o.office).length < 3) issues.office = m.office;
  if (needs === "address") {
    if (str(o.address).length < 5) issues.address = m.address;
    if (!/^\d{4}$/.test(str(o.postcode))) issues.postcode = m.postcode;
  }
  return issues;
}

export type OrderInput = z.output<ReturnType<typeof orderSchema>>;

export type OrderLine = {
  sku: string;
  /** Bulgarian name, for the shop. */
  name: string;
  /** Name in the customer's language, for their e-mail. */
  nameCustomer: string;
  slug: string;
  price: number;
  qty: number;
  total: number;
};

export type Order = {
  number: string;
  createdAt: string;
  locale: Locale;
  customer: { name: string; phone: string; email: string };
  delivery: { method: ShippingMethodId; label: string; city: string; postcode: string; office: string; address: string };
  note: string;
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  total: number;
  payment: "cod";
  /** True while any product price in the order is an import estimate, not a confirmed price. */
  hasEstimatedPrices: boolean;
};

export class OrderError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Prices and stock always come from the catalog, never from the browser. */
export function buildOrder(input: OrderInput, locale: Locale): Order {
  const m = MESSAGES[locale];
  const stock = STOCK[locale];
  const lines: OrderLine[] = [];
  const problems: string[] = [];
  let estimated = false;
  const merged = new Map<string, number>();
  for (const item of input.items) merged.set(item.sku, (merged.get(item.sku) ?? 0) + item.qty);
  for (const [sku, qty] of merged) {
    const p = getBySku(sku);
    if (!p) {
      problems.push(m.gone);
      continue;
    }
    if (p.stock < qty) {
      problems.push(p.stock > 0 ? stock.only(p.name[locale], p.stock) : stock.soldOut(p.name[locale]));
      continue;
    }
    if (!p.priceConfirmed) estimated = true;
    lines.push({ sku, name: p.name.bg, nameCustomer: p.name[locale], slug: p.slug, price: p.price, qty, total: round(p.price * qty) });
  }
  if (problems.length) throw new OrderError([...new Set(problems)].join(" "));

  const subtotal = round(lines.reduce((s, l) => s + l.total, 0));
  const shipping = shippingPrice(input.method, subtotal);
  const method = SHIPPING.methods.find((x) => x.id === input.method)!;
  const now = new Date();
  return {
    number: orderNumber(now),
    createdAt: now.toISOString(),
    locale,
    customer: { name: input.name, phone: input.phone, email: input.email },
    delivery: {
      method: input.method,
      label: method.label[locale],
      city: input.city,
      postcode: input.postcode,
      office: method.needs === "office" ? input.office : "",
      address: method.needs === "address" ? input.address : "",
    },
    note: input.note,
    lines,
    subtotal,
    shipping,
    total: round(subtotal + shipping),
    payment: "cod",
    hasEstimatedPrices: estimated,
  };
}

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function orderNumber(d: Date): string {
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  let tail = "";
  for (let i = 0; i < 4; i++) tail += ALPHABET[randomInt(ALPHABET.length)];
  return `KD-${ymd}-${tail}`;
}

export function dataDir(): string {
  return path.resolve(process.cwd(), process.env.DATA_DIR || "../kadife-data");
}

/** One JSON object per line. This file is the order book of the shop: back it up. */
export async function saveOrder(order: Order): Promise<void> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  await appendFile(path.join(dir, "orders.jsonl"), JSON.stringify(order) + "\n", "utf8");
}

// ── E-mail ──

function transport() {
  if (!process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const MAIL = {
  bg: {
    subtotal: "Междинна сума",
    delivery: "Доставка",
    free: "безплатна",
    total: "Общо за плащане при получаване",
    office: "Офис/автомат",
    address: "Адрес",
    subject: (n: string) => `Поръчка ${n} е приета`,
    hello: (name: string) => `Здравейте, ${name}!`,
    received: (n: string) => `Получихме поръчката ви ${n}. Ще се свържем с вас за потвърждение в работно време.`,
    discreet: (sender: string) => `Пратката е в кашон без лого и надписи. Подател на товарителницата: ${sender}.`,
  },
  en: {
    subtotal: "Subtotal",
    delivery: "Delivery",
    free: "free",
    total: "Total to pay on delivery",
    office: "Office/locker",
    address: "Address",
    subject: (n: string) => `Order ${n} received`,
    hello: (name: string) => `Hello ${name},`,
    received: (n: string) => `We have received your order ${n}. We will contact you during working hours to confirm it.`,
    discreet: (sender: string) => `Your parcel comes in a plain box without logo or labels. Sender on the waybill: ${sender}.`,
  },
};

function summaryText(o: Order, locale: Locale): string {
  const t = MAIL[locale];
  const rows = o.lines.map((l) => `• ${locale === "bg" ? l.name : l.nameCustomer} × ${l.qty} = ${price(l.total, locale)}`).join("\n");
  const where = o.delivery.office ? `${t.office}: ${o.delivery.office}` : `${t.address}: ${o.delivery.address}, ${o.delivery.postcode}`;
  const label = SHIPPING.methods.find((x) => x.id === o.delivery.method)!.label[locale];
  return [
    rows,
    "",
    `${t.subtotal}: ${price(o.subtotal, locale)}`,
    `${t.delivery}: ${o.shipping ? price(o.shipping, locale) : t.free}`,
    `${t.total}: ${price(o.total, locale)}`,
    "",
    `${label}, ${o.delivery.city}`,
    where,
  ].join("\n");
}

function summaryHtml(o: Order, locale: Locale): string {
  const t = MAIL[locale];
  const rows = o.lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0">${esc(locale === "bg" ? l.name : l.nameCustomer)} × ${l.qty}</td><td style="padding:6px 0;text-align:right;white-space:nowrap">${price(l.total, locale)}</td></tr>`,
    )
    .join("");
  const where = o.delivery.office ? `${t.office}: ${esc(o.delivery.office)}` : `${t.address}: ${esc(o.delivery.address)}, ${esc(o.delivery.postcode)}`;
  const label = SHIPPING.methods.find((x) => x.id === o.delivery.method)!.label[locale];
  return `<table style="width:100%;border-collapse:collapse;font:15px/1.5 Arial,sans-serif;color:#1d1416">${rows}
<tr><td style="padding-top:12px;border-top:1px solid #e2d6c9">${t.delivery}</td><td style="padding-top:12px;border-top:1px solid #e2d6c9;text-align:right">${o.shipping ? price(o.shipping, locale) : t.free}</td></tr>
<tr><td style="padding:6px 0;font-weight:bold">${t.total}</td><td style="text-align:right;font-weight:bold">${price(o.total, locale)}</td></tr></table>
<p style="font:15px/1.5 Arial,sans-serif;color:#4a3c3f">${esc(label)}, ${esc(o.delivery.city)}<br>${where}</p>`;
}

/** Sends the shop (in Bulgarian) and the customer (in their language) an e-mail. Never throws: the order is saved. */
export async function mailOrder(o: Order): Promise<void> {
  const tr = transport();
  if (!tr) {
    console.warn(`[orders] ${o.number}: SMTP is not configured, the order is only in ${path.join(dataDir(), "orders.jsonl")}`);
    return;
  }
  const from = process.env.MAIL_FROM || `${SITE.name} <${SITE.email}>`;
  const shopTo = process.env.SHOP_EMAIL || SITE.email;
  const customerBlock = `Клиент: ${o.customer.name}\nТелефон: ${o.customer.phone}\nИмейл: ${o.customer.email}\nЕзик на поръчката: ${o.locale === "en" ? "английски" : "български"}${o.note ? `\nБележка: ${o.note}` : ""}`;
  const warning = o.hasEstimatedPrices ? "\n\nВНИМАНИЕ: поне една цена в поръчката е приблизителна (не е потвърдена в data/prices.csv)." : "";
  const c = MAIL[o.locale];
  const sender = SITE.parcelSender[o.locale];
  const shopName = o.locale === "bg" ? SITE.name : SITE.nameLatin;
  const jobs = [
    tr.sendMail({
      from,
      to: shopTo,
      replyTo: o.customer.email,
      subject: `Нова поръчка ${o.number} — ${price(o.total, "bg")}`,
      text: `${customerBlock}\n\n${summaryText(o, "bg")}${warning}`,
    }),
    tr.sendMail({
      from,
      to: o.customer.email,
      subject: c.subject(o.number),
      text: `${c.hello(o.customer.name)}\n\n${c.received(o.number)}\n\n${summaryText(o, o.locale)}\n\n${c.discreet(sender)}\n\n${shopName}\n${SITE.phone} · ${SITE.email}`,
      html: `<div style="font:15px/1.6 Arial,sans-serif;color:#1d1416;max-width:560px"><p>${esc(c.hello(o.customer.name))}</p><p>${esc(c.received(o.number))}</p>${summaryHtml(o, o.locale)}<p style="color:#4a3c3f">${esc(c.discreet(sender))}</p><p style="color:#6f5f62">${esc(shopName)} · ${SITE.phone} · ${SITE.email}</p></div>`,
    }),
  ];
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === "rejected") console.error(`[orders] ${o.number}: e-mail failed`, r.reason);
}

// ── Simple per-IP limits against spam bots ──
// Attempts (including ones with typos) are generous; placed orders are strict.

const hits = new Map<string, number[]>();
const WINDOW = 15 * 60 * 1000;

function recent(key: string): number[] {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW)) hits.delete(k);
  return list;
}

/** Records an attempt. True when the IP sent more than 30 order requests in 15 minutes. */
export function tooManyAttempts(ip: string): boolean {
  const list = recent(`a:${ip}`);
  list.push(Date.now());
  return list.length > 30;
}

/** True when the IP already placed 5 orders in the last 15 minutes. */
export function tooManyOrders(ip: string): boolean {
  return recent(`o:${ip}`).length >= 5;
}

export function recordOrder(ip: string): void {
  recent(`o:${ip}`).push(Date.now());
}
