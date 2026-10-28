// Finds more photos for products that have only one or two, and saves them to public/products/<sku>/.
//
//   npm run photos                         (products with ≤ 2 photos that were not searched yet, in-stock ones first)
//   npm run photos -- --limit 20           (only 20, for a test)
//   npm run photos -- --only Dilon-303235  (comma-separated SKUs, searched again)
//   npm run photos -- --retry              (also search again where nothing was found last time)
//   npm run photos -- --recheck            (check the kept photos again with the current rules, remove the ones that fail)
//
// 1. A web search (OpenAI, gpt-5.4-mini) finds product pages of exactly this product: the brand's site first, then
//    retailers and wholesalers, matched by EAN where there is one.
// 2. The photos are read from those pages (JSON-LD, Open Graph, Shopify, WooCommerce, Magento, PrestaShop galleries),
//    downloaded, and small ones, odd shapes and near-copies of photos we already have are dropped.
// 3. gpt-5.5 compares every candidate with our own photo and keeps only the same product in the same colour, as a clean
//    shop photo: no watermark or other shop's logo, no size chart or banner, nothing explicit.
// 4. The kept photos are saved as WebP (max 1000 px) and listed in data/photos/photos.json, which `npm run import`
//    adds to the product gallery.
//
// Needs OPENAI_API_KEY in .env.local.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { CATEGORY_BY_ID, findSub } from "../src/lib/taxonomy";
import type { Product, ProductDetails } from "../src/lib/types";
import { decode } from "./sexwell-fetch";
import { FatalApiError, loadEnv, respond, tokenLine } from "./openai";

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const LIMIT = Number(arg("--limit") ?? Infinity);
const ONLY = arg("--only")?.split(",").map((s) => s.trim());
const RETRY = args.includes("--retry");
const RECHECK = args.includes("--recheck");
const CONCURRENCY = Number(arg("--concurrency") ?? 8);
const SEARCH_MODEL = "gpt-5.4-mini";
const VISION_MODEL = "gpt-5.5";
const MAX_NEW = 6;
const STORE = path.join(ROOT, "data", "photos", "photos.json");
const PUBLIC_DIR = path.join(ROOT, "public");

export type FoundPhoto = { file: string; source: string; kind: string };
export type PhotoEntry = {
  checked: string;
  pages: string[];
  candidates: number;
  photos: FoundPhoto[];
  /** Why candidates were turned down (for checking the rules, not used by the shop). */
  notes?: string[];
};

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36";
// Sites that never give us usable pages (log-in walls, bot blocks, user photos) or that we already used.
const SKIP_HOSTS = /(^|\.)(sexwell\.bg|sexwellshop\.com|amazon\.[a-z.]+|ebay\.[a-z.]+|google\.[a-z.]+|facebook\.com|instagram\.com|pinterest\.[a-z.]+|youtube\.com|tiktok\.com|reddit\.com|aliexpress\.[a-z]+|temu\.com)$/i;

// ── 1. Web search ──

const PAGES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pages"],
  properties: {
    pages: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["url", "exact"], properties: { url: { type: "string" }, exact: { type: "boolean" } } },
    },
  },
};

function describe(p: Product): string {
  const category = CATEGORY_BY_ID.get(p.category)!;
  const sub = findSub(p.category, p.sub)!;
  return [
    `Name: ${p.name.bg} (English: ${p.name.en})`,
    p.brand ? `Brand: ${p.brand}` : "",
    p.ean ? `EAN/GTIN: ${p.ean}` : "",
    `Type: ${category.name.en} › ${sub.name.en}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function findPages(p: Product): Promise<string[]> {
  const text = await respond({
    model: SEARCH_MODEL,
    reasoning: { effort: "low" },
    tools: [{ type: "web_search" }],
    input: `Find product detail pages that show photos of exactly this product:\n${describe(p)}\n\nPrefer the brand's official website, then large retailers or wholesalers whose pages have several photos. The page must be for the same model and the same colour/variant (check the EAN when there is one). Return up to 6 URLs of product pages, not search, category or marketplace listing pages. Mark "exact" true only when the page clearly is this exact product.`,
    text: { format: { type: "json_schema", name: "pages", strict: true, schema: PAGES_SCHEMA } },
  });
  const { pages } = JSON.parse(text) as { pages: { url: string; exact: boolean }[] };
  return pages
    .filter((x) => x.exact)
    .map((x) => x.url.replace(/[?&]utm_[^&]+/g, "").replace(/\?$/, ""))
    .filter((url) => {
      try {
        const u = new URL(url);
        return /^https?:$/.test(u.protocol) && !SKIP_HOSTS.test(u.hostname);
      } catch {
        return false;
      }
    })
    .slice(0, 6);
}

// ── 2. Photos on a product page ──

async function fetchText(url: string, accept = "text/html"): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "en,bg;q=0.8" }, signal: AbortSignal.timeout(20_000), redirect: "follow" });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 4_000_000 ? null : text;
  } catch {
    return null;
  }
}

const NOT_A_PHOTO = /logo|icon|sprite|banner|payment|flag|avatar|placeholder|loader|loading|spinner|badge|rating|star|social|blank|pixel|tracking|\.svg|\.gif/i;

function jsonLdImages(html: string): string[] {
  const out: string[] = [];
  const take = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(take);
    else if (v && typeof v === "object" && "url" in v) take((v as { url: unknown }).url);
  };
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    const type = ([] as unknown[]).concat(o["@type"] ?? []).map(String);
    if (type.some((t) => /Product/.test(t))) take(o.image);
    if (o["@graph"]) visit(o["@graph"]);
    if (o.mainEntity) visit(o.mainEntity);
    if (o.hasVariant) visit(o.hasVariant);
  };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(m[1].trim()));
    } catch {
      // broken JSON-LD on the page
    }
  }
  return out;
}

/** Product codes in a photo's file name: "OU1004BLU-1.jpg" → ["ou1004blu"], "295570-296694_217788" → three. */
function codeTokens(url: string): string[] {
  const file = url.split(/[?#]/)[0].split("/").pop() ?? "";
  return file
    .toLowerCase()
    .replace(/\.\w+$/, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 5 && /\d/.test(t) && !/^\d{2,4}x\d{2,4}$/.test(t) && !/^(?:19|20)\d{2}\d{0,4}$/.test(t));
}

/** Photo URLs of the product on a page, best sources first. */
export async function pagePhotos(pageUrl: string, ean?: string): Promise<string[]> {
  const html = await fetchText(pageUrl);
  if (!html) return [];
  const found: string[] = [];
  const add = (...urls: string[]) => found.push(...urls);

  // Shopify: the product's own JSON has every photo in order.
  if (/cdn\.shopify\.com|Shopify\.theme/.test(html) && /\/products\//.test(pageUrl)) {
    const u = new URL(pageUrl);
    const json = await fetchText(`${u.origin}${u.pathname.replace(/\/$/, "")}.js`, "application/json");
    try {
      if (json) add(...(JSON.parse(json).images as string[]));
    } catch {
      // not the JSON we expected
    }
  }
  add(...jsonLdImages(html));
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*content=["']([^"']+)/gi)) add(m[1]);
  for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/gi)) add(m[1]);
  // WooCommerce, PrestaShop, OpenCart, zoom plug-ins.
  for (const m of html.matchAll(/data-(?:large_image|zoom-image|zoom|large|full|image-large-src|original|big)=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/woocommerce-product-gallery__image[^>]*>\s*<a[^>]+href=["']([^"']+)["']/gi)) add(m[1]);
  // Magento galleries and other JSON blobs: "full":"…", "large":{"url":"…"}.
  for (const m of html.matchAll(/"(?:full|large|zoom|original|img_large|large_url)"\s*:\s*(?:\{\s*"url"\s*:\s*)?"(https?:[^"]+?\.(?:jpe?g|png|webp)[^"]*)"/gi)) add(m[1].replace(/\\\//g, "/"));
  // The rest of the gallery is usually somewhere else in the page (script data, sliders, lightboxes) under file names
  // with the same product code as the photos above: "OU1004BLU-1.jpg" → "OU1004BLU-5.jpg", "img0-REA191TAN1_0.webp".
  const plain = html.replace(/\\u002F/gi, "/").replace(/\\\//g, "/");
  const everywhere = [...plain.matchAll(/(?:https?:)?\/\/[^\s"'<>()\\,]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>()\\,]*)?|(?<=["'=(\s])\/[^\s"'<>()\\,]+?\.(?:jpe?g|png|webp)/gi)].map((m) => m[0]);
  const codes = new Set([...found.flatMap(codeTokens), ...(ean ? [ean] : [])]);
  if (codes.size) add(...everywhere.filter((url) => codeTokens(url).some((t) => codes.has(t)) || (ean !== undefined && url.includes(ean))));
  // Fallback: plain <img> tags, only when the page has nothing structured.
  if (found.length < 2) {
    for (const m of html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi)) add(m[1]);
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of found) {
    let url: string;
    try {
      url = new URL(decode(raw.trim()).replace(/^\/\//, "https://"), pageUrl).href;
    } catch {
      continue;
    }
    if (!/^https?:/.test(url) || NOT_A_PHOTO.test(url) || /%|\{/.test(url)) continue;
    // One photo in several sizes: WordPress "-300x300", Shopify "_600x", PrestaShop "-home_default".
    const key = url
      .toLowerCase()
      .replace(/\?.*$/, "")
      .replace(/-\d{2,4}x\d{2,4}(?=\.\w+$)/, "")
      .replace(/_\d{2,4}x\d{0,4}(?=\.\w+$)/, "")
      .replace(/-(?:small|medium|home|cart|large|thickbox)_default/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out.slice(0, 20);
}

// ── 3. Download, size checks, near-copies ──

type Candidate = { url: string; page: string; data: Buffer; width: number; height: number; hash: string };

async function download(url: string, referer?: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/avif,image/webp,image/*,*/*", ...(referer ? { Referer: referer } : {}) }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok || !/^image\//.test(res.headers.get("content-type") ?? "image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 6_000 && buf.length < 15_000_000 ? buf : null;
  } catch {
    return null;
  }
}

/** 64-bit difference hash as "0101…": near-identical photos (other size, light compression) differ in a few bits. */
async function dHash(data: Buffer): Promise<string> {
  // Without the white border, so the same packshot with more or less padding still matches.
  const flat = await sharp(data).flatten({ background: "#ffffff" }).toBuffer();
  const trimmed = await sharp(flat).trim({ threshold: 12 }).toBuffer().catch(() => flat);
  const px = await sharp(trimmed).grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let h = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h += px[y * 9 + x] > px[y * 9 + x + 1] ? "1" : "0";
  return h;
}
const distance = (a: string, b: string) => [...a].filter((bit, i) => bit !== b[i]).length;
// Measured: the same shot cropped or zoomed differs by ~13 bits, other shots and other products by 25+.
const SAME_PHOTO = 10;

async function candidate(url: string, page: string): Promise<Candidate | null> {
  const data = await download(url, page);
  if (!data) return null;
  try {
    const meta = await sharp(data).metadata();
    const width = meta.autoOrient?.width ?? meta.width ?? 0;
    const height = meta.autoOrient?.height ?? meta.height ?? 0;
    if (Math.min(width, height) < 400 || width / height > 2.6 || height / width > 2.6) return null;
    return { url, page, data, width, height, hash: await dHash(data) };
  } catch {
    return null;
  }
}

/** Small JPEG for the vision check. */
const preview = async (data: Buffer) =>
  `data:image/jpeg;base64,${(await sharp(data).rotate().flatten({ background: "#ffffff" }).resize(512, 512, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer()).toString("base64")}`;

// ── 4. Vision check ──

const KINDS = ["packshot", "on_model", "detail", "packaging", "lifestyle", "other"] as const;
const VERDICTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["candidate", "same_product", "new_view", "usable", "kind", "reason"],
        properties: {
          candidate: { type: "integer" },
          same_product: { type: "boolean" },
          new_view: { type: "boolean" },
          usable: { type: "boolean" },
          kind: { type: "string", enum: KINDS },
          reason: { type: "string" },
        },
      },
    },
  },
};
const verdictsShape = z.object({
  results: z.array(
    z.object({ candidate: z.number().int(), same_product: z.boolean(), new_view: z.boolean(), usable: z.boolean(), kind: z.enum(KINDS), reason: z.string() }),
  ),
});

type Verdict = z.infer<typeof verdictsShape>["results"][number];

async function check(p: Product, references: string[], candidates: Candidate[]): Promise<Verdict[]> {
  const content: Record<string, unknown>[] = [
    {
      type: "input_text",
      text: `You check photos for an online shop. The reference photo(s) show our product:\n${describe(p)}\n\nFor each numbered candidate decide:\n- same_product: true only if it clearly shows this exact product — the same model and the same colour, print and variant (for clothing: the same garment). Compare the colour closely: another shade of the same model (light flesh vs tan or brown, black vs dark blue, pink vs purple) is a different variant. Similar products of the same brand, other colours or sizes, sets that differ, and photos where you cannot tell are false. A photo of the product's own packaging counts as the same product. For packaged goods (lube, condoms, cosmetics, supplements, boxed products) the packaging design must match the reference — same bottle or box shape, colours and label layout; an older, newer or regional packaging version is not the same product.\n- new_view: true only if it shows the product in a way that the references and the earlier candidates you marked new_view do not: another angle, the back or side, worn or held by a model, a close-up of a detail, the packaging, the contents. The same view again — even zoomed, cropped, mirrored or on another background — is false.\n- usable: true only if it is a clean photo a shop can show: no watermark, no logo or name of another shop, no text overlay or price badge added to the photo, not a collage with other products, not a size chart, logo, banner or icon, the product clearly visible, no visible nipples or genitals (also not through sheer fabric), no topless or nude model, no sexual act. Lingerie worn by a model that covers this is fine.\n- kind: packshot (product alone), on_model (worn or held by a model), detail (close-up), packaging, lifestyle, other.\nAnswer for every candidate.`,
    },
    ...(
      await Promise.all(references.map(async (ref, i) => [{ type: "input_text", text: `Reference ${i + 1}:` }, { type: "input_image", image_url: ref, detail: "high" }]))
    ).flat(),
  ];
  for (const [i, c] of candidates.entries()) {
    content.push({ type: "input_text", text: `Candidate ${i + 1}:` }, { type: "input_image", image_url: await preview(c.data), detail: "high" });
  }
  const text = await respond({
    model: VISION_MODEL,
    reasoning: { effort: "low" },
    input: [{ role: "user", content }],
    text: { format: { type: "json_schema", name: "verdicts", strict: true, schema: VERDICTS_SCHEMA } },
  });
  return verdictsShape.parse(JSON.parse(text)).results;
}

// ── 5. One product ──

async function improve(p: Product, existing: string[]): Promise<PhotoEntry> {
  const pages = await findPages(p);
  const urls: { url: string; page: string }[] = [];
  for (const page of pages) for (const url of await pagePhotos(page, p.ean || undefined)) if (!urls.some((u) => u.url === url)) urls.push({ url, page });

  const ours = (await Promise.all(existing.map((url) => download(url)))).filter((b): b is Buffer => b !== null);
  if (!ours.length) return { checked: new Date().toISOString(), pages, candidates: 0, photos: [] };
  const known = await Promise.all(ours.map(dHash));

  const kept: Candidate[] = [];
  const queue = urls.slice(0, 30);
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let u = queue.shift(); u; u = queue.shift()) {
        const c = await candidate(u.url, u.page);
        if (c && !known.some((h) => distance(h, c.hash) <= SAME_PHOTO)) kept.push(c);
      }
    }),
  );
  // The same photo found on two sites: keep the bigger copy.
  kept.sort((a, b) => b.width * b.height - a.width * a.height);
  const unique = kept.filter((c, i) => !kept.slice(0, i).some((o) => distance(o.hash, c.hash) <= SAME_PHOTO));
  // Back in page order (the brand's site and its gallery order first).
  unique.sort((a, b) => urls.findIndex((u) => u.url === a.url) - urls.findIndex((u) => u.url === b.url));
  const toCheck = unique.slice(0, 20);
  if (!toCheck.length) return { checked: new Date().toISOString(), pages, candidates: 0, photos: [] };

  const references = await Promise.all(ours.slice(0, 2).map(preview));
  const verdicts: (Verdict & { c: Candidate })[] = [];
  for (let i = 0; i < toCheck.length; i += 10) {
    const chunk = toCheck.slice(i, i + 10);
    for (const v of await check(p, references, chunk)) if (chunk[v.candidate - 1]) verdicts.push({ ...v, c: chunk[v.candidate - 1] });
  }
  const ok = (v: (typeof verdicts)[number]) => v.same_product && v.new_view && v.usable && v.kind !== "other";
  const accepted = verdicts.filter(ok).slice(0, MAX_NEW);
  const notes = verdicts.filter((v) => !ok(v)).slice(0, 12).map((v) => v.reason.slice(0, 100));

  const dir = path.join(PUBLIC_DIR, "products", p.sku.toLowerCase());
  mkdirSync(dir, { recursive: true });
  const photos: FoundPhoto[] = [];
  for (const v of accepted) {
    const name = createHash("sha1").update(v.c.url).digest("hex").slice(0, 12);
    // Without wide white borders, so the photo fills the gallery tile like the others.
    const flat = await sharp(v.c.data).rotate().flatten({ background: "#ffffff" }).toBuffer();
    const trimmed = await sharp(flat).trim({ threshold: 10 }).toBuffer().catch(() => flat);
    await sharp(trimmed)
      .resize(1000, 1000, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(dir, `${name}.webp`));
    photos.push({ file: `/products/${p.sku.toLowerCase()}/${name}.webp`, source: v.c.page, kind: v.kind });
  }
  return { checked: new Date().toISOString(), pages, candidates: toCheck.length, photos, notes };
}

// ── Check kept photos again ──

/** The vision check with the current rules on photos kept earlier. Returns the ones that still pass. */
async function recheck(p: Product, existing: string[], photos: FoundPhoto[]): Promise<FoundPhoto[]> {
  const ours = (await Promise.all(existing.map((url) => download(url)))).filter((b): b is Buffer => b !== null);
  if (!ours.length) return photos;
  const saved = photos.map((photo) => ({ photo, data: readFileSync(path.join(PUBLIC_DIR, photo.file)) }));
  const as: Candidate[] = saved.map(({ photo, data }) => ({ url: photo.file, page: photo.source, data, width: 0, height: 0, hash: "" }));
  const verdicts = await check(p, await Promise.all(ours.slice(0, 2).map(preview)), as);
  const pass = new Set(verdicts.filter((v) => v.same_product && v.new_view && v.usable && v.kind !== "other").map((v) => v.candidate - 1));
  return saved.filter((_, i) => pass.has(i)).map(({ photo }) => photo);
}

/** Photo files that no entry lists (from a run that was stopped half-way). */
function removeOrphans(store: Record<string, PhotoEntry>) {
  const listed = new Set(Object.values(store).flatMap((e) => e.photos.map((x) => x.file)));
  const root = path.join(PUBLIC_DIR, "products");
  if (!existsSync(root)) return 0;
  let removed = 0;
  for (const dir of readdirSync(root)) {
    for (const file of readdirSync(path.join(root, dir))) {
      if (!listed.has(`/products/${dir}/${file}`)) {
        rmSync(path.join(root, dir, file));
        removed++;
      }
    }
    if (!readdirSync(path.join(root, dir)).length) rmSync(path.join(root, dir), { recursive: true });
  }
  return removed;
}

// ── Run ──

async function main() {
  loadEnv();
  mkdirSync(path.dirname(STORE), { recursive: true });
  const products = JSON.parse(readFileSync(path.join(ROOT, "src", "data", "catalog.json"), "utf8")) as Product[];
  const details = JSON.parse(readFileSync(path.join(ROOT, "src", "data", "details.json"), "utf8")) as Record<string, ProductDetails>;
  const store: Record<string, PhotoEntry> = existsSync(STORE) ? JSON.parse(readFileSync(STORE, "utf8")) : {};
  const save = () => writeFileSync(STORE, JSON.stringify(store, null, 1) + "\n");
  const existing = (p: Product) => [p.image, ...(details[p.sku]?.gallery ?? []).filter((g) => /^https?:/.test(g))];

  if (RECHECK) {
    const entries = products.filter((p) => store[p.sku]?.photos.length && (!ONLY || ONLY.includes(p.sku)));
    console.log(`${entries.length} products: checking their kept photos again`);
    let removed = 0;
    const queue = [...entries];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let p = queue.shift(); p; p = queue.shift()) {
          try {
            const keep = await recheck(p, existing(p), store[p.sku].photos);
            for (const old of store[p.sku].photos) if (!keep.includes(old)) rmSync(path.join(PUBLIC_DIR, old.file), { force: true });
            removed += store[p.sku].photos.length - keep.length;
            store[p.sku] = { ...store[p.sku], photos: keep };
          } catch (err) {
            if (err instanceof FatalApiError) throw err;
            console.warn(`  ${p.sku}: ${(err as Error).message.slice(0, 200)}`);
          }
        }
      }),
    );
    save();
    console.log(`✓ ${removed} photos removed, ${removeOrphans(store)} unlisted files deleted · ${tokenLine()}`);
    return;
  }

  const todo = products
    .filter((p) => {
      if (ONLY) return ONLY.includes(p.sku);
      const entry = store[p.sku];
      if (entry && !(RETRY && !entry.photos.length)) return false;
      return existing(p).length <= 2;
    })
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0))
    .slice(0, LIMIT);
  console.log(`${todo.length} products to find photos for`);

  let done = 0;
  let improved = 0;
  let added = 0;
  let fatal: FatalApiError | undefined;
  let lastSave = Date.now();
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let p = queue.shift(); p && !fatal; p = queue.shift()) {
        try {
          const entry = await improve(p, existing(p));
          // A new search for the same product replaces the photos of the earlier one.
          for (const old of store[p.sku]?.photos ?? []) {
            if (!entry.photos.some((x) => x.file === old.file)) rmSync(path.join(PUBLIC_DIR, old.file), { force: true });
          }
          store[p.sku] = entry;
          if (entry.photos.length) improved++;
          added += entry.photos.length;
        } catch (err) {
          if (err instanceof FatalApiError) {
            fatal = err;
            break;
          }
          console.warn(`  ${p.sku}: ${(err as Error).message.slice(0, 200)}`);
        }
        if (++done % 20 === 0) console.log(`  ${done}/${todo.length} · ${improved} products got ${added} photos · ${tokenLine()}`);
        if (Date.now() - lastSave > 15_000) {
          save();
          lastSave = Date.now();
        }
      }
    }),
  );
  save();
  if (fatal) {
    console.error(`\n✗ Stopped: ${fatal.message}\n  Run \`npm run photos\` again to continue where it stopped.`);
    process.exitCode = 1;
  }
  console.log(`✓ ${improved} of ${done} products got ${added} new photos · ${tokenLine()}`);
  console.log("  Run `npm run import` to add them to the product pages.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
