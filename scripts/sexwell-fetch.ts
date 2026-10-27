// Finds every catalog product on sexwell.bg and saves its description, short specs, photo gallery and price to
// data/sexwell/pages.json. That file is the source for `npm run enrich`, which rewrites the descriptions.
//
//   npm run sexwell                (only products not looked up yet)
//   npm run sexwell -- --refresh   (look up every product again)
//   npm run sexwell -- --limit 20  (only the first 20 products, for a test)
//   npm run sexwell -- --recheck-names  (look up again the products matched by name to another size, e.g. L → S)
//
// Matching: most of our photos come from sexwellshop.com and are named after the sexwell.bg product code
// (".../detailed/4/43685-1.png" → code 43685), so the product is found by code and the code on the page must match.
// Products without such a photo are searched by name and only accepted when the names match closely.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Product } from "../src/lib/types";

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data", "sexwell");
const OUT = path.join(OUT_DIR, "pages.json");
const BASE = "https://sexwell.bg";
const args = process.argv.slice(2);
const refresh = args.includes("--refresh");
const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const recheckNames = args.includes("--recheck-names");
const CONCURRENCY = 4;

export type SexwellPage = {
  found: true;
  via: "code" | "name";
  url: string;
  code: string;
  title: string;
  brand: string;
  /** Regular price in euro (sexwell.bg), 0 when missing. */
  price: number;
  salePrice: number;
  /** The short spec list next to the photo: [label, value], e.g. ["Материал", "Силикон"]. */
  specs: [string, string][];
  /** Description as plain text: paragraphs separated by blank lines, list items starting with "- ". */
  text: string;
  /** Full-size gallery photos in page order (the first is usually the photo we already have). */
  images: string[];
  fetched: string;
};
export type SexwellMiss = { found: false; tried: string[]; fetched: string };
export type SexwellEntry = SexwellPage | SexwellMiss;

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", ndash: "–", mdash: "—", hellip: "…", bdquo: "„",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", sbquo: "‚", laquo: "«", raquo: "»", deg: "°", times: "×",
  euro: "€", reg: "®", trade: "™", copy: "©", plusmn: "±", frac12: "½", frac14: "¼", micro: "µ", middot: "·",
  bull: "•", shy: "", zwnj: "", zwj: "", lrm: "", rlm: "",
};
export function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const stripTags = (s: string) => decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

/** The description HTML as plain text that keeps paragraphs, line breaks and list items. */
function htmlToText(html: string): string {
  const text = decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|ul|ol|h\d|table|tr)>/gi, "\n\n")
      .replace(/<\/t[dh]>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  );
  return text
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .filter((l) => !/sexwell/i.test(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parsePage(html: string, url: string): Omit<SexwellPage, "found" | "via" | "fetched"> | null {
  const code = /id="product_code_main_product_\d+">\s*([^<]+?)\s*</.exec(html)?.[1];
  const title = /<h1 class="product-title[^"]*"\s*>\s*<bdi>([\s\S]*?)<\/bdi>/.exec(html)?.[1];
  if (!code || !title) return null;

  let brand = "";
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(m[1]);
      if (String(j["@type"]).endsWith("Product") && j.brand?.name) brand = String(j.brand.name).trim();
    } catch {
      // other JSON-LD blocks
    }
  }
  const money = (prop: string) => Number(new RegExp(`property="${prop}" content="([\\d.]+)"`).exec(html)?.[1] ?? 0) || 0;

  const specs: [string, string][] = [];
  for (const m of html.matchAll(/<li class="sub_accent_feature[^"]*">\s*<strong>([\s\S]*?)<\/strong>([\s\S]*?)<\/li>/g)) {
    const label = stripTags(m[1]).replace(/:$/, "").trim();
    const value = stripTags(m[2]).replace(/\.$/, "").trim();
    if (label && value && !/ключова дума/i.test(label)) specs.push([label, value]);
  }

  const desc = /id="content_description"[\s\S]*?<article>([\s\S]*?)<\/article>/.exec(html)?.[1] ?? "";
  const images: string[] = [];
  for (const m of html.matchAll(/<a [^>]*data-ca-image-id="preview\[product_images_[^"]*"[^>]*href="(https:\/\/sexwell\.bg\/images\/detailed\/[^"]+)"/g)) {
    if (!images.includes(m[1])) images.push(m[1]);
  }
  return { url, code: decode(code), title: stripTags(title), brand, price: money("product:price:amount"), salePrice: money("product:sale_price:amount"), specs, text: htmlToText(desc), images };
}

/** Product links and titles from a search result page. */
function parseResults(html: string): { url: string; title: string }[] {
  const out: { url: string; title: string }[] = [];
  for (const m of html.matchAll(/<a href="(https:\/\/sexwell\.bg\/[a-z0-9-]+\.html)" class="product-title" title="([^"]*)"/g)) {
    if (!out.some((r) => r.url === m[1])) out.push({ url: m[1], title: decode(m[2]).trim() });
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, method: "GET" | "HEAD" = "GET"): Promise<{ status: number; body: string }> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36", "Accept-Language": "bg" },
        signal: AbortSignal.timeout(30_000),
      });
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        await sleep(2000 * 2 ** attempt);
        continue;
      }
      return { status: res.status, body: method === "GET" ? await res.text() : "" };
    } catch (err) {
      if (attempt >= 4) throw err;
      await sleep(2000 * 2 ** attempt);
    }
  }
}

const searchUrl = (q: string, byCode: boolean) =>
  `${BASE}/?dispatch=products.search&subcats=Y&search_performed=Y&pname=Y&match=all${byCode ? "&pcode_from_q=Y" : ""}&q=${encodeURIComponent(q)}`;

/** Lower-case words without punctuation, Latin and Cyrillic look-alikes unified. */
// Latin letters typed inside Cyrillic words ("куклa", "TAMПOНИ") as their Cyrillic twins.
const LOOKALIKES: Record<string, string> = { a: "а", b: "в", c: "с", e: "е", h: "н", k: "к", m: "м", o: "о", p: "р", t: "т", x: "х", y: "у" };

export function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => (/\p{Script=Cyrillic}/u.test(w) ? w.replace(/[a-z]/g, (ch) => LOOKALIKES[ch] ?? ch) : w));
}

const SIZE_WORDS = new Set([
  "xxs", "xs", "s", "m", "l", "xl", "xxl", "xxxl", "2xl", "3xl", "4xl", "sm", "ml", "os", "mini", "small", "medium", "large",
  "big", "мини", "малък", "малка", "малко", "малки", "среден", "средна", "средно", "голям", "голяма", "голямо", "големи",
]);
/** Names that differ in a size or a number are different products ("GLEAMING LOVE L" and "GLEAMING LOVE S"). */
function otherVariant(a: string, b: string): boolean {
  const A = new Set(words(a));
  const B = new Set(words(b));
  const differ = [...[...A].filter((w) => !B.has(w)), ...[...B].filter((w) => !A.has(w))];
  return differ.some((w) => SIZE_WORDS.has(w) || /^\d/.test(w));
}
function similarity(a: string, b: string): number {
  const A = new Set(words(a));
  const B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const w of A) if (B.has(w)) common++;
  return common / Math.max(A.size, B.size);
}

const codeFromImage = (image: string) =>
  /sexwellshop\.com\/.*\/detailed\/\d+\/(\d{3,7})(?:[-_]\d{1,2})?\.(?:jpe?g|png|webp)$/i.exec(image)?.[1];

// sexwell.bg's own transliteration for page addresses: "Чорапогащници" → "chorapogaschnici", "стъклени" → "stkleni".
const SW_TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n",
  о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ь: "",
  ю: "yu", я: "ya", ё: "e", ы: "y", э: "e",
};
function sexwellSlug(name: string): string {
  return [...name.toLowerCase()]
    .map((ch) => SW_TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9\s-]+/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

/** Products that are sold out on sexwell.bg are left out of its search, but their pages still open by address. */
async function guessByAddress(p: Product, code: string | undefined, tried: string[]) {
  const slug = sexwellSlug(p.name.bg);
  if (!slug) return null;
  for (const url of [`${BASE}/${slug}.html`, `${BASE}/${slug}-bg.html`]) {
    tried.push(url);
    const page = await get(url);
    const parsed = page.status === 200 ? parsePage(page.body, url) : null;
    if (!parsed) continue;
    if (code && parsed.code === code) return { via: "code" as const, parsed };
    if (similarity(parsed.title, p.name.bg) >= 0.75 && !otherVariant(parsed.title, p.name.bg)) return { via: "name" as const, parsed };
  }
  return null;
}

/** sexwell.bg names the brand differently sometimes ("NS NOVELTIES", "YOU 2 TOYS"); only a clear mismatch counts. */
function brandClash(p: Product, page: { brand: string; title: string }): boolean {
  if (!p.brand || !page.brand) return false;
  const ours = words(p.brand).join("");
  return words(page.brand).join("") !== ours && !words(page.title).join("").includes(ours);
}

export async function lookup(p: Product): Promise<SexwellEntry> {
  const tried: string[] = [];
  const fetched = new Date().toISOString();
  const code = codeFromImage(p.image);
  if (code) {
    tried.push(`code ${code}`);
    const results = parseResults((await get(searchUrl(code, true))).body);
    for (const r of results.slice(0, 4)) {
      const page = await get(r.url);
      const parsed = page.status === 200 ? parsePage(page.body, r.url) : null;
      if (parsed && parsed.code === code) return { found: true, via: "code", ...parsed, fetched };
    }
  }
  const guessed = await guessByAddress(p, code, tried);
  if (guessed && (guessed.via === "code" || !brandClash(p, guessed.parsed))) return { found: true, via: guessed.via, ...guessed.parsed, fetched };

  // By name: the export uses sexwell.bg's own names for most products, so an exact or near-exact title is required.
  const queries = [p.name.bg, p.name.bg.replace(/[,(].*$/, "").trim()].filter((q, i, a) => q.length >= 4 && a.indexOf(q) === i);
  for (const q of queries) {
    tried.push(`name "${q}"`);
    const results = parseResults((await get(searchUrl(q, false))).body)
      .map((r) => ({ ...r, score: similarity(r.title, p.name.bg) }))
      .filter((r) => r.score >= 0.75 && !otherVariant(r.title, p.name.bg))
      .sort((a, b) => b.score - a.score);
    for (const r of results.slice(0, 2)) {
      const page = await get(r.url);
      const parsed = page.status === 200 ? parsePage(page.body, r.url) : null;
      if (parsed && !brandClash(p, parsed)) return { found: true, via: "name", ...parsed, fetched };
    }
  }
  return { found: false, tried, fetched };
}

/** Drops gallery photos that no longer load. */
async function checkImages(entry: SexwellPage): Promise<void> {
  const ok: string[] = [];
  for (const url of entry.images) if ((await get(url, "HEAD")).status === 200) ok.push(url);
  entry.images = ok;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const products = JSON.parse(readFileSync(path.join(ROOT, "src", "data", "catalog.json"), "utf8")) as Product[];
  const cache: Record<string, SexwellEntry> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  const wrongVariant = (p: Product) => {
    const e = cache[p.sku];
    return !!e?.found && e.via === "name" && otherVariant(e.title, p.name.bg);
  };
  const todo = products.filter((p) => refresh || !cache[p.sku] || (recheckNames && wrongVariant(p))).slice(0, limit);
  console.log(`${products.length} products, ${todo.length} to look up on sexwell.bg`);

  let done = 0;
  let lastSave = Date.now();
  const save = () => writeFileSync(OUT, JSON.stringify(cache, null, 1) + "\n");
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        try {
          const entry = await lookup(p);
          if (entry.found) await checkImages(entry);
          cache[p.sku] = entry;
        } catch (err) {
          console.warn(`  ${p.sku}: ${(err as Error).message}`);
        }
        done++;
        if (done % 50 === 0) console.log(`  ${done}/${todo.length}`);
        if (Date.now() - lastSave > 20_000) {
          save();
          lastSave = Date.now();
        }
      }
    }),
  );
  save();

  const entries = products.map((p) => cache[p.sku]).filter(Boolean);
  const found = entries.filter((e): e is SexwellPage => e.found);
  console.log(`✓ ${found.length} of ${products.length} products found on sexwell.bg (${found.filter((e) => e.via === "code").length} by code, ${found.filter((e) => e.via === "name").length} by name)`);
  console.log(`  ${found.filter((e) => e.text.length > 80).length} with a description, ${found.filter((e) => e.specs.length).length} with specs, ${found.filter((e) => e.images.length > 1).length} with more than one photo`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
