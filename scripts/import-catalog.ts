// Builds src/data/catalog.json from the company-wide product export.
//
//   npm run import -- --file "../entire products_export (9).csv"
//   npm run import -- --file <csv> --prices data/prices.csv   (real prices: columns SKU and Price)
//   npm run import -- --file <csv> --skip-images              (keep the last image check, no network)
//
// Every picture URL is downloaded once and checked (cached in data/image-check.json for 7 days),
// so the shop never shows a broken or placeholder image.
//
// English names come from data/translations/product-names-en.json ({ SKU: { bg, en } }). A product whose Bulgarian name
// changed, or that is new, gets a glossary translation and is listed in data/translations/missing-en.json.
//
// Descriptions, specs and extra photos come from data/descriptions/descriptions.json (`npm run enrich`) and
// data/sexwell/pages.json (`npm run sexwell`) and are written to src/data/details.json. Without confirmed prices, the
// regular sexwell.bg price of the same product is used as the estimate.

import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import { CATEGORY_BY_ID, findSub } from "../src/lib/taxonomy";
import type { Feature, FlagKey, Product, ProductDetails } from "../src/lib/types";
import { sourceFor, sourceHash, type StoredDescription } from "./enrich-descriptions";
import {
  audiencesFor, brandKey, canonicalBrand, classify, cleanName, type CsvRow, estimatePrice, fallbackEnglishName, featuresFor, imageUrl,
  type Rejection, selectRow, slugify, translit,
} from "./rules";
import { type SexwellEntry, type SexwellPage, words } from "./sexwell-fetch";

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const csvFile = path.resolve(arg("--file") ?? path.join(ROOT, "..", "entire products_export (9).csv"));
const pricesFile = path.resolve(arg("--prices") ?? path.join(ROOT, "data", "prices.csv"));
const skipImages = args.includes("--skip-images");
const recheck = args.includes("--recheck-images");

const DATA = path.join(ROOT, "data");
const TRANSLATIONS = path.join(DATA, "translations", "product-names-en.json");
const MISSING = path.join(DATA, "translations", "missing-en.json");
const SEXWELL = path.join(DATA, "sexwell", "pages.json");
const DESCRIPTIONS = path.join(DATA, "descriptions", "descriptions.json");
const OUT = path.join(ROOT, "src", "data");
mkdirSync(path.join(DATA, "translations"), { recursive: true });
mkdirSync(OUT, { recursive: true });

type Candidate = { row: CsvRow; name: string; brand: string; image: string; stock: number; category: string; sub: string };

/** Rows per brand (column value) in the whole export, and how many of them are adult products. */
const brandRows = new Map<string, { all: number; adult: number }>();

async function readRows(): Promise<Candidate[]> {
  if (!existsSync(csvFile)) throw new Error(`CSV not found: ${csvFile}`);
  const rejected: Record<Rejection, number> = { inactive: 0, pack: 0, "no-image": 0, "not-adult": 0, gift: 0, unclassified: 0 };
  const unclassified: string[] = [];
  const out: Candidate[] = [];
  let total = 0;
  const parser = createReadStream(csvFile).pipe(parse({ columns: true, bom: true, relax_quotes: true, relax_column_count: true }));
  for await (const row of parser as AsyncIterable<CsvRow>) {
    total++;
    const why = selectRow(row);
    const key = brandKey(row.Brand ?? "");
    const counts = brandRows.get(key) ?? { all: 0, adult: 0 };
    counts.all++;
    if (!why) counts.adult++;
    brandRows.set(key, counts);
    if (why) {
      rejected[why]++;
      continue;
    }
    const name = cleanName(row.Name);
    const brand = canonicalBrand(row.Brand ?? "", name);
    const placement = classify(name, brand);
    if (!placement) {
      rejected.unclassified++;
      unclassified.push(`${row.SKU} | ${row.Category} | ${row.Brand} | ${row.Name}`);
      continue;
    }
    const inventory = Math.max(0, Math.floor(Number(row.Inventory) || 0));
    const reserved = Math.max(0, Math.floor(Number(row.Reserved) || 0));
    out.push({ row, name, brand, image: imageUrl(row)!, stock: Math.max(0, inventory - reserved), ...placement });
  }
  console.log(`  ${total.toLocaleString("en")} rows read, ${out.length} adult products selected`);
  console.log(`  skipped: ${Object.entries(rejected).filter(([k]) => k !== "not-adult").map(([k, v]) => `${k} ${v}`).join(", ")}`);
  report.unclassified = unclassified;
  // A brand that is mostly used on non-adult products ("Apple", "Eaton") was typed into the adult row by mistake.
  for (const c of out) {
    const counts = brandRows.get(brandKey(c.row.Brand ?? ""));
    const trusted = !counts || counts.all <= 5 || counts.adult / counts.all >= 0.5;
    if (!trusted) c.brand = canonicalBrand(c.row.Brand ?? "", c.name, false);
  }
  return out;
}

const report: {
  unclassified: string[];
  brokenImages: string[];
  placeholderImages: string[];
  duplicates: number;
  notOnSexwell?: string[];
  withoutDescription?: string[];
  staleDescriptions?: string[];
} = {
  unclassified: [], brokenImages: [], placeholderImages: [], duplicates: 0, staleDescriptions: [],
};

/** Same product listed under several SKUs: keep the one with stock, then the newest. */
function dedupe(items: Candidate[]): Candidate[] {
  const byKey = new Map<string, Candidate>();
  const better = (a: Candidate, b: Candidate) =>
    a.stock !== b.stock ? a.stock > b.stock : a.row.Updated > b.row.Updated;
  for (const c of items) {
    const ean = c.row.EAN.replace(/\D/g, "");
    const keys = [`n:${c.brand.toLowerCase()}|${c.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()}`];
    if (ean.length >= 8) keys.push(`e:${ean}`);
    const existingKey = keys.find((k) => byKey.has(k));
    if (!existingKey) {
      for (const k of keys) byKey.set(k, c);
      continue;
    }
    report.duplicates++;
    const existing = byKey.get(existingKey)!;
    const winner = better(c, existing) ? c : existing;
    for (const [k, v] of byKey) if (v === existing) byKey.set(k, winner);
    for (const k of keys) byKey.set(k, winner);
  }
  return [...new Set(byKey.values())];
}

type ImageCheck = { ok: boolean; status: number; bytes: number; hash: string; type: string; at: string };
const CHECK_FILE = path.join(DATA, "image-check.json");
const WEEK = 7 * 24 * 3600 * 1000;

async function checkImages(urls: string[]): Promise<Map<string, ImageCheck>> {
  const cache: Record<string, ImageCheck> = existsSync(CHECK_FILE) ? JSON.parse(readFileSync(CHECK_FILE, "utf8")) : {};
  if (skipImages) return new Map(Object.entries(cache));
  const todo = urls.filter((u) => recheck || !cache[u] || Date.now() - Date.parse(cache[u].at) > WEEK);
  console.log(`  checking ${todo.length} images (${urls.length - todo.length} cached)`);
  let done = 0;
  const worker = async () => {
    while (todo.length) {
      const url = todo.pop()!;
      cache[url] = await checkOne(url);
      if (++done % 100 === 0) {
        process.stdout.write(`    ${done}\r`);
        writeFileSync(CHECK_FILE, JSON.stringify(cache));
      }
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  writeFileSync(CHECK_FILE, JSON.stringify(cache));
  return new Map(Object.entries(cache));
}

async function checkOne(url: string, attempt = 1): Promise<ImageCheck> {
  const at = new Date().toISOString();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36", accept: "image/*" },
    });
    const type = res.headers.get("content-type") ?? "";
    const body = Buffer.from(await res.arrayBuffer());
    const ok = res.ok && type.startsWith("image/") && body.length > 1500;
    return { ok, status: res.status, bytes: body.length, hash: createHash("sha1").update(body).digest("hex"), type, at };
  } catch {
    if (attempt < 3) return checkOne(url, attempt + 1);
    return { ok: false, status: 0, bytes: 0, hash: "", type: "", at };
  }
}

function readPrices(): Map<string, number> {
  const prices = new Map<string, number>();
  if (!existsSync(pricesFile)) return prices;
  const lines = readFileSync(pricesFile, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const sep = lines[0].includes(";") ? ";" : ",";
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const skuCol = head.findIndex((h) => h === "sku");
  const priceCol = head.findIndex((h) => h === "price" || h === "цена");
  if (skuCol < 0 || priceCol < 0) throw new Error(`${pricesFile}: needs columns "SKU" and "Price"`);
  for (const line of lines.slice(1)) {
    const cells = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const value = Number(cells[priceCol]?.replace(",", "."));
    if (cells[skuCol] && value > 0) prices.set(cells[skuCol], Math.round(value * 100) / 100);
  }
  console.log(`  ${prices.size} confirmed prices from ${path.relative(ROOT, pricesFile)}`);
  return prices;
}

const readJson = <T,>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);

/** Feature flags confirmed by the product description, added to the ones read from the name. */
function withFlags(features: Feature[], flags: FlagKey[]): Feature[] {
  const out = [...features];
  for (const flag of flags) if (!out.some(([key]) => key === flag)) out.push([flag]);
  return out;
}

/**
 * Extra photos from sexwell.bg, without the one we already show. Our supplier photo has the same file name as the
 * matching sexwell.bg photo; a photo from elsewhere (Amazon, Kaufland…) is the same packshot as sexwell.bg's first one.
 */
function galleryFor(main: string, images: string[]): string[] {
  const file = (url: string) => url.split("/").pop()!.toLowerCase();
  const rest = main.includes("sexwellshop.com") ? images.filter((url) => file(url) !== file(main)) : images.slice(1);
  return rest.slice(0, 7);
}

const COLOUR_WORD =
  /^(чере?н|бял|бел|червен|розов|лилав|син|зелен|злат|среб|телес|прозрач|натурал|бежов|кафяв|сив|жълт|оранж|мрежест|black|white|red|pink|purple|blue|green|gold|silver|nude|clear|beige|brown|gr[ae]y|yellow|orange)/;

/**
 * A product matched by name to sexwell.bg's page for all its colours ("Сутиен …, Черен" ↔ "Сутиен …"): the description
 * fits, but the photos and the colour spec may be of other colours.
 */
function otherColours(name: string, page: SexwellPage): boolean {
  if (page.via !== "name") return false;
  const title = new Set(words(page.title));
  return words(name).some((w) => !title.has(w) && COLOUR_WORD.test(w));
}

/** Spec value as shown: capital first letter, Bulgarian grams as "г" (sexwell.bg writes "гр"). */
function specValue(s: string, locale: "bg" | "en"): string {
  const value = locale === "bg" ? s.replace(/(\d)\s?гр\.?(?=$|[\s,;/)])/gu, "$1 г") : s;
  return value.charAt(0).toLocaleUpperCase(locale === "bg" ? "bg-BG" : "en-GB") + value.slice(1);
}

async function main() {
  console.log(`Reading ${csvFile}`);
  const selected = dedupe(await readRows());
  console.log(`  ${selected.length} unique products after removing ${report.duplicates} duplicates`);

  const checks = await checkImages([...new Set(selected.map((c) => c.image))]);
  // One picture shared by unrelated products is a "no photo" placeholder. Size variants of one product
  // (same subcategory) legitimately share a photo.
  const hashUsers = new Map<string, { names: Set<string>; subs: Set<string> }>();
  for (const c of selected) {
    const h = checks.get(c.image)?.hash;
    if (!h) continue;
    const users = hashUsers.get(h) ?? { names: new Set(), subs: new Set() };
    users.names.add(c.name);
    users.subs.add(`${c.category}/${c.sub}`);
    hashUsers.set(h, users);
  }
  const usable = selected.filter((c) => {
    const check = checks.get(c.image);
    if (!check?.ok) {
      report.brokenImages.push(`${c.row.SKU} ${c.image} (${check?.status ?? "unchecked"})`);
      return false;
    }
    const users = hashUsers.get(check.hash);
    if (users && users.names.size >= 3 && users.subs.size >= 2) {
      report.placeholderImages.push(`${c.row.SKU} ${c.image}`);
      return false;
    }
    return true;
  });
  console.log(`  ${usable.length} with a working picture (${report.brokenImages.length} broken, ${report.placeholderImages.length} placeholders)`);

  const prices = readPrices();
  const translations: Record<string, { bg: string; en: string }> = existsSync(TRANSLATIONS) ? JSON.parse(readFileSync(TRANSLATIONS, "utf8")) : {};
  const missing: { sku: string; bg: string; category: string; sub: string }[] = [];
  const pages = readJson<Record<string, SexwellEntry>>(SEXWELL, {});
  const descriptions = readJson<Record<string, StoredDescription>>(DESCRIPTIONS, {});
  const details: Record<string, ProductDetails> = {};
  let referencePrices = 0;
  const slugs = new Set<string>();
  const products: Product[] = usable.map((c) => {
    const placement = { category: c.category, sub: c.sub };
    const t = translations[c.row.SKU];
    const en = t && t.bg === c.name && t.en.trim() ? t.en.trim() : fallbackEnglishName(c.name);
    if (!(t && t.bg === c.name)) missing.push({ sku: c.row.SKU, bg: c.name, category: c.category, sub: c.sub });
    let slug = slugify(en) || slugify(c.name) || "product";
    if (slugs.has(slug)) slug = `${slug}-${slugify(c.row.SKU)}`;
    slugs.add(slug);
    const confirmed = prices.get(c.row.SKU);
    const category = CATEGORY_BY_ID.get(c.category)!;
    const sub = findSub(c.category, c.sub)!;
    const page = pages[c.row.SKU];
    const sexwell = page?.found ? page : undefined;
    // A description written from an older or different sexwell.bg page could state wrong facts; it is left out until
    // `npm run enrich` rewrites it. A text written from the name stays when only the prompt for those changed.
    const source = sourceFor(page);
    const stored = descriptions[c.row.SKU];
    const fresh =
      stored &&
      (stored.source === sourceHash({ name: { bg: c.name, en }, brand: c.brand, ...placement }, source) ||
        (stored.basis === "name" && source.basis === "name"));
    const description = fresh ? stored : undefined;
    if (stored && !fresh) report.staleDescriptions!.push(`${c.row.SKU} ${c.name}`);
    const colourVariant = !!sexwell && otherColours(c.name, sexwell);
    const specs = (description?.specs ?? [])
      .filter((s) => !(colourVariant && s.key === "colour"))
      .map((s) => ({ key: s.key, value: { bg: specValue(s.bg, "bg"), en: specValue(s.en, "en") } }));
    const gallery = sexwell && !colourVariant ? galleryFor(c.image, sexwell.images) : [];
    if (description || gallery.length) {
      details[c.row.SKU] = { ...(description ? { copy: { bg: description.bg, en: description.en } } : {}), specs, gallery };
    }
    const reference = confirmed === undefined && sexwell && sexwell.price > 0 ? Math.round(sexwell.price * 100) / 100 : undefined;
    if (reference !== undefined) referencePrices++;
    const specWords = specs.filter((s) => s.key === "material" || s.key === "colour").flatMap((s) => [s.value.bg, s.value.en]);
    const words = `${c.name} ${en} ${c.brand} ${category.name.bg} ${category.name.en} ${sub.name.bg} ${sub.name.en} ${specWords.join(" ")}`.toLowerCase();
    const created = c.row.Created || c.row.Updated || "";
    return {
      sku: c.row.SKU,
      slug,
      name: { bg: c.name, en },
      brand: c.brand,
      brandSlug: c.brand ? slugify(c.brand) : "",
      category: c.category,
      sub: c.sub,
      audiences: audiencesFor(c.name, placement),
      price: confirmed ?? reference ?? estimatePrice(c.row.SKU, c.name, c.brand, placement),
      priceConfirmed: confirmed !== undefined,
      stock: c.stock,
      image: c.image,
      ean: c.row.EAN.replace(/\D/g, "").length >= 8 ? c.row.EAN.trim() : "",
      features: withFlags(featuresFor(c.name, c.row.Color ?? "", c.category), description?.flags ?? []),
      search: `${words} ${translit(words)}`.replace(/\s+/g, " "),
      created,
      rank:
        (c.stock > 0 ? 1000 : 0) +
        (/sexwellshop\.com/.test(c.image) ? 40 : 0) +
        (c.brand ? 25 : 0) +
        Math.min(30, Math.max(0, Math.floor((Date.parse(created) - Date.parse("2026-01-01")) / (10 * 24 * 3600 * 1000)))),
    };
  });
  products.sort((a, b) => b.rank - a.rank || a.name.bg.localeCompare(b.name.bg, "bg"));

  writeFileSync(path.join(OUT, "catalog.json"), JSON.stringify(products));
  writeFileSync(path.join(OUT, "details.json"), JSON.stringify(details));
  report.notOnSexwell = products.filter((p) => !pages[p.sku]?.found).map((p) => `${p.sku} ${p.name.bg}`);
  report.withoutDescription = products.filter((p) => !details[p.sku]?.copy).map((p) => `${p.sku} ${p.name.bg}`);
  const photos = [...products.map((p) => p.image), ...Object.values(details).flatMap((d) => d.gallery)];
  const hosts = [...new Set(photos.map((url) => new URL(url).hostname))].sort();
  writeFileSync(path.join(OUT, "image-hosts.json"), JSON.stringify(hosts, null, 2) + "\n");
  writeFileSync(path.join(DATA, "import-report.json"), JSON.stringify(report, null, 2));
  writeFileSync(MISSING, JSON.stringify(missing, null, 2) + "\n");

  const perCategory = new Map<string, number>();
  for (const p of products) perCategory.set(p.category, (perCategory.get(p.category) ?? 0) + 1);
  console.log(`✓ ${products.length} products written to src/data/catalog.json (${products.filter((p) => p.stock > 0).length} in stock)`);
  for (const [id, count] of perCategory) console.log(`    ${CATEGORY_BY_ID.get(id)!.name.bg}: ${count}`);
  console.log(`  ${missing.length} products without a checked English name — see data/translations/missing-en.json`);
  const described = Object.values(details).filter((d) => d.copy).length;
  console.log(`  ${described} with a description (${products.length - described} without — see data/import-report.json), ${Object.values(details).filter((d) => d.gallery.length).length} with extra photos`);
  if (report.staleDescriptions!.length) {
    console.log(`  ${report.staleDescriptions!.length} descriptions left out because their sexwell.bg source changed — run \`npm run enrich\``);
  }
  console.log(`  ${prices.size ? `${products.filter((p) => p.priceConfirmed).length} confirmed prices, ` : ""}${referencePrices} prices taken from sexwell.bg, ${products.filter((p) => !p.priceConfirmed).length - referencePrices} estimated`);
  console.log(`  ${report.unclassified.length} rows could not be classified — see data/import-report.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
