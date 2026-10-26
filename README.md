# Кадифе — adult shop (18+)

Storefront in Bulgarian and English for the adult products in the company CSV export. No admin panel: the catalog is
generated from the CSV, orders are saved to a file and e-mailed to the shop. Next.js 16 + Tailwind CSS 4, no database.

| | |
| --- | --- |
| Shop (Bulgarian) | `http://localhost:3000/` |
| Shop (English) | `http://localhost:3000/en` |
| Orders | `$DATA_DIR/orders.jsonl` (one JSON per line) + e-mail to `SHOP_EMAIL` when SMTP is set |

## Quick start

```bash
npm install
cp .env.example .env.local                                  # set SMTP_* and SHOP_EMAIL to receive orders by e-mail
npm run import -- --file "../entire products_export (9).csv" # builds src/data/catalog.json (≈1 min, checks every picture)
npm run dev                                                 # or: npm run build && npm start
```

## Languages

Bulgarian lives at the root, English under `/en`. Every page exists in both languages under the same path and slug:
`/category/vibrators/rabbit-vibrators` ↔ `/en/category/vibrators/rabbit-vibrators`,
`/product/butt-plug-rear-assets-small` ↔ `/en/product/butt-plug-rear-assets-small`. The BG/EN switch in the header keeps
the current page and its filters. `src/proxy.ts` rewrites Bulgarian addresses to `app/[locale]` internally; `/bg/…`
redirects to the address without `/bg`.

| What | Where |
| --- | --- |
| Interface texts (buttons, labels, e-mails to customers…) | `src/i18n/dict.ts`, `src/lib/orders.ts` |
| Category and subcategory names, care texts | `src/lib/taxonomy.ts` |
| Product names in English | `data/translations/product-names-en.json` |
| Information and legal pages | `src/content/pages.tsx` |

**Product names:** all 2,377 current products have an English name in `data/translations/product-names-en.json`
(`{ "SKU": { "bg": "…", "en": "…" } }`). The `bg` value is the Bulgarian name it was translated from; if a product's
Bulgarian name changes or a new product appears, the import gives it a glossary translation and lists it in
`data/translations/missing-en.json`. Add proper translations for those to the JSON file and run the import again.
Slugs are made from the English names.

The shop's own order e-mail is always in Bulgarian; the customer's e-mail is in the language they ordered in.

## Categories

11 categories and 90 subcategories. The Bulgarian names follow the menus of sexwell.bg, lovex.bg, passion.bg and
sexo.bg; the English ones use the usual adult-retail terms:

Вибратори / Vibrators · Дилда / Dildos · Анални играчки / Anal Toys · Мастурбатори / Masturbators ·
Уголемяване на пенис / Penis Enhancement · За двама / Couples · BDSM / BDSM & Bondage · Еротично бельо / Lingerie ·
Лубриканти / Lube · Секс аптека / Sexual Wellness · Презервативи / Condoms — plus the collections
„За нея“ / For Her and „За него“ / For Him.

## Catalog import (`npm run import`)

`scripts/rules.ts` picks the adult products out of the ~438,000-row export and sorts them:

1. A row is adult when it is in the "Sexual Wellness" category, has a sexwellshop.com picture, an adult brand, or an
   unmistakable adult word in the name. Baby goods, pharmacy items, books and electronics that share words are excluded.
2. Only active, single items with a picture (no "Pack 10x" rows, no free gifts or vouchers).
3. The category comes from the product type named first in the name ("Анален разширител …" → Анални играчки ›
   Анални разширители), then details in the name pick the subcategory (stone → jeweled plugs, vibration → vibrating plugs…).
4. Duplicates (same EAN or same brand + name) are merged; the one with stock wins.
5. Every picture URL is downloaded once (cached 7 days in `data/image-check.json`); broken pictures and "no photo"
   placeholders are dropped.

Result of the last run: **2,377 products**, 980 in stock, 134 brands. Details of what was skipped: `data/import-report.json`.

After a new import run `npm run build` again (the catalog is part of the build).

Options: `--prices <csv>` (default `data/prices.csv`), `--skip-images` (reuse the last picture check, no network),
`--recheck-images`.

## Prices

**The export has no prices.** Until real prices are given, the import estimates a retail price per product from its
subcategory, brand and features (e.g. Tenga eggs 11,90 €, condoms by count, lubricants by volume). Each product has
`priceConfirmed: false`, and the order e-mail warns when an order contains estimated prices.

Real prices: put a CSV with the columns `SKU` and `Price` (euro, VAT included; `,` or `;` separated) at
`data/prices.csv` — see `data/prices.example.csv` — and run the import again.

## Orders

Checkout is cash on delivery (Speedy / Econt office or locker, or address). The server re-reads prices and stock from
the catalog, never from the browser. Each order is appended to `$DATA_DIR/orders.jsonl` (with the language it was
placed in) and, when `SMTP_HOST` is set, e-mailed to `SHOP_EMAIL` and to the customer. **Without SMTP the orders are
only in that file** — back it up.

Spam protection: hidden honeypot field, max 30 attempts and 5 placed orders per IP per 15 minutes.

## Age gate

First visit shows a full-screen "Само за пълнолетни" / "Adults only" gate.

- **Yes** remembers the answer for 30 days (cookie `kd_age=1` + localStorage).
- **No** shows an **"Access denied"** screen instead of the shop and remembers it until the browser is closed (session
  cookie `kd_age=0`): reloading or opening any other page of the site shows the same screen. Its "Leave this site"
  button tries to close the tab and otherwise sends the visitor to google.com.
- Both screens have a **Parental controls** note (Family Safety, blocking adult sites, SafeSearch) and a step-by-step
  guide for Windows, iPhone/iPad/Mac, Android/Chromebook, search engines and the home router, shown inside the gate so a
  child never sees the shop. The same guide is the page `/info/parental-controls` (footer → Правна информация).
- Every page carries the **RTA "Restricted To Adults" label** (`<meta name="RATING">` and the `Rating` response header)
  plus `<meta name="rating" content="adult">`, so parental-control software and SafeSearch block the site automatically.

Returning visitors never see a flash of the wrong screen: an inline script in `<head>` applies the stored answer before
the first paint, and the gate re-checks the cookie after React loads. Without JavaScript the gate cannot be passed.

## Where to change things

| What | File |
| --- | --- |
| Shop name, contacts, company data, delivery prices, free-delivery limit, waybill sender | `src/lib/site.ts` |
| Categories, subcategory names, care texts | `src/lib/taxonomy.ts` |
| Product selection / classification / price estimates | `scripts/rules.ts` |
| Interface texts in both languages | `src/i18n/dict.ts` |
| Info and legal pages (both languages) | `src/content/pages.tsx` |
| Colours, fonts, motion | `src/app/globals.css`, `src/app/fonts.ts` |

## Before going live

- Real prices (`data/prices.csv`).
- Everything in `[brackets]` in `src/lib/site.ts`: company name, ЕИК, ДДС, address, manager. Real phone and e-mail.
- `NEXT_PUBLIC_SITE_URL` and SMTP settings in `.env.local` on the server.
- Have a lawyer review the legal pages (`/info/terms`, `/info/privacy`, `/info/returns` and their English versions).
- Product pictures are hot-linked from the suppliers (mostly sexwellshop.com, Amazon, Kaufland). Next.js caches resized
  copies for 30 days, but if a supplier blocks hot-linking the pictures must be downloaded and self-hosted.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | Development server / production build / production server |
| `npm run import -- --file <csv>` | Rebuild the catalog from the export |
| `npm run typecheck` / `npm run lint` | Type check / ESLint |
# dilon_store
