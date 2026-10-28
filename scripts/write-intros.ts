// Writes the intro texts of subcategory and brand pages in Bulgarian and English with the OpenAI API:
// a lead under the title and a few paragraphs under the products. Result: src/data/intros.json.
//
//   npm run intros                 (pages without a text, or whose source changed)
//   npm run intros -- --only brand:shots,sub:vibrators/rabbit-vibrators
//
// - Subcategories: general buying advice for the product type, grounded in what the shop sells in it.
// - Brands: only facts from the manufacturer paragraphs of the sexwell.bg descriptions or, when there are none, facts a
//   web search found on the brand's own site or other reliable pages (kept with their sources in data/intros/facts.json).
//   Without facts the text is only about the products the shop carries.
// The same checks as for product descriptions: no 8 words copied, no number that is not in the source, no other shop.
//
// Needs OPENAI_API_KEY in .env.local.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CATEGORIES } from "../src/lib/taxonomy";
import type { Product, ProductDetails } from "../src/lib/types";
import { FatalApiError, loadEnv, respond, tokenLine } from "./openai";
import type { SexwellEntry } from "./sexwell-fetch";

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : undefined;
const OUT = path.join(ROOT, "src", "data", "intros.json");
const FACTS = path.join(ROOT, "data", "intros", "facts.json");
const MODEL = "gpt-5.5";
const RESEARCH_MODEL = "gpt-5.4-mini";
/** Brands without an intro: Sexwell is the shop the descriptions come from. */
const NO_INTRO = new Set(["sexwell"]);

export type Intro = { lede: string; about: string[] };
export type IntroEntry = { source: string; bg: Intro; en: Intro };
export type Intros = { subs: Record<string, IntroEntry>; brands: Record<string, IntroEntry> };

const TONE = `Tone: warm, confident and frank, never vulgar, never cheesy. Short sentences, no exclamation marks, no clichés, no emoji.
Bulgarian: natural modern Bulgarian, polite plural ("изберете"), lower-case "вие/ви", Bulgarian quotes „…“. Use Bulgarian words, not English ones (анален разширител, вибратор заек, масажор, бондидж, бельо, играчки за възрастни), except in brand and product names. English: natural British English.
Never mention other shops, prices, discounts, delivery or stock. No medical promises.`;

const INTRO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lede", "about"],
  properties: { lede: { type: "string" }, about: { type: "array", items: { type: "string" } } },
};
const SCHEMA = { type: "object", additionalProperties: false, required: ["bg", "en"], properties: { bg: INTRO_SCHEMA, en: INTRO_SCHEMA } };
const introShape = z.object({ lede: z.string().trim().min(20).max(260), about: z.array(z.string().trim().min(30)).min(1).max(4) });
const resultShape = z.object({ bg: introShape, en: introShape });

const wordsOf = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter(Boolean);
function copied(text: string, source: string, n = 8): boolean {
  const src = wordsOf(source);
  const runs = new Set<string>();
  for (let i = 0; i + n <= src.length; i++) runs.add(src.slice(i, i + n).join(" "));
  const w = wordsOf(text);
  for (let i = 0; i + n <= w.length; i++) if (runs.has(w.slice(i, i + n).join(" "))) return true;
  return false;
}
const numbersOf = (s: string) => [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => String(Number(m[0].replace(",", "."))));

function problems(r: z.infer<typeof resultShape>, source: string): string[] {
  const all = [r.bg.lede, ...r.bg.about, r.en.lede, ...r.en.about].join("\n");
  const out: string[] = [];
  if (copied([r.bg.lede, ...r.bg.about].join(" "), source)) out.push("Some sentences are copied from the source; write them in your own words.");
  const allowed = new Set(numbersOf(source));
  const invented = [...new Set(numbersOf(all))].filter((n) => !allowed.has(n));
  if (invented.length) out.push(`These numbers are not in the source, leave them out: ${invented.join(", ")}`);
  if (/sexwell|сексуел/i.test(all)) out.push("Do not mention sexwell or any other shop.");
  return out;
}

async function write(instructions: string, brief: string): Promise<{ bg: Intro; en: Intro }> {
  const ask = (input: string) =>
    respond({
      model: MODEL,
      instructions,
      input,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "intro", strict: true, schema: SCHEMA } },
    }).then((t) => resultShape.parse(JSON.parse(t)));
  let r = await ask(brief);
  const issues = problems(r, brief);
  if (issues.length) r = await ask(`${brief}\n\nYour previous answer had problems. Write it again and fix them:\n- ${issues.join("\n- ")}`);
  const tidy = (i: Intro): Intro => ({ lede: i.lede.replace(/\s+/g, " ").trim(), about: i.about.map((a) => a.replace(/\s+/g, " ").trim()) });
  return { bg: tidy(r.bg), en: tidy(r.en) };
}

// ── Subcategories ──

const SUB_INSTRUCTIONS = `You write the intro of a category page for "Кадифе" (Kadife), a discreet, elegant Bulgarian online shop for adult products (18+), in Bulgarian and in English.
- lede: one sentence (max 180 characters) under the title: what this kind of product is and why people choose it.
- about: 2–3 short paragraphs (together 90–170 words) shown under the products: what it is and how it is used, what to look for when choosing (size, material, power, fit…), and one practical tip on safety or care where it fits.
Use accurate general knowledge about this product type. You may name up to 3 brands from the list of what the shop sells, nothing else specific. No numbers and no statistics.
${TONE}`;

function subBrief(cat: (typeof CATEGORIES)[number], subId: string, items: Product[], details: Record<string, ProductDetails>): string {
  const sub = cat.subs.find((s) => s.id === subId)!;
  const brands = [...new Set(items.map((p) => p.brand).filter(Boolean))].slice(0, 12);
  const materials = [...new Set(items.flatMap((p) => (details[p.sku]?.specs ?? []).filter((s) => s.key === "material").map((s) => s.value.en)))].slice(0, 12);
  return [
    `Page: ${cat.name.bg} › ${sub.name.bg} (English: ${cat.name.en} › ${sub.name.en})`,
    `About the whole category: ${cat.about.en}`,
    `The shop sells ${items.length} products here, for example: ${items.slice(0, 25).map((p) => p.name.en).join("; ")}`,
    brands.length ? `Brands: ${brands.join(", ")}` : "",
    materials.length ? `Materials of these products: ${materials.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ── Brands ──

const BRAND_INSTRUCTIONS = `You write the intro of a brand page for "Кадифе" (Kadife), a discreet, elegant Bulgarian online shop for adult products (18+), in Bulgarian and in English.
- lede: one sentence (max 180 characters) under the brand name.
- about: 1–2 short paragraphs (together 60–130 words) shown under the products: who the brand is and what it is known for, then what the shop carries from it.
Use only the facts given about the brand — never add a country, year, founder, award or claim that is not in them. When there are no facts, write only about the products the shop carries. Rewrite in your own words; do not copy sentences from the facts.
${TONE}`;

const FACTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["facts"],
  properties: {
    facts: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["fact", "url"], properties: { fact: { type: "string" }, url: { type: "string" } } },
    },
  },
};
type Fact = { fact: string; url: string };

async function research(brand: string, examples: string[]): Promise<Fact[]> {
  const text = await respond({
    model: RESEARCH_MODEL,
    reasoning: { effort: "low" },
    tools: [{ type: "web_search" }],
    input: `Find reliable basic facts about the brand "${brand}", which makes adult products, lingerie or sexual-wellness products (for example: ${examples.join("; ")}). Prefer the brand's official website. Facts like: country, founding year, parent company, what it is known for (product types, materials, signature ranges). Return up to 6 short facts in English, each with the URL it comes from. Only facts that are clearly about this brand; return an empty list if you are not sure.`,
    text: { format: { type: "json_schema", name: "facts", strict: true, schema: FACTS_SCHEMA } },
  });
  return (JSON.parse(text) as { facts: Fact[] }).facts.filter((f) => /^https?:\/\//.test(f.url)).slice(0, 6);
}

/** The "За производителя" paragraphs of the brand's sexwell.bg descriptions. */
function manufacturerTexts(items: Product[], pages: Record<string, SexwellEntry>): string[] {
  const out = new Set<string>();
  for (const p of items) {
    const page = pages[p.sku];
    if (!page?.found) continue;
    const m = /За производителя:?\s*\n?([\s\S]*?)(?:\n\n|$)/.exec(page.text);
    if (m && m[1].trim().length > 40) out.add(m[1].trim());
  }
  return [...out].slice(0, 3);
}

function brandBrief(name: string, items: Product[], manufacturer: string[], facts: Fact[]): string {
  const types = new Map<string, number>();
  for (const p of items) {
    const sub = CATEGORIES.find((c) => c.id === p.category)!.subs.find((s) => s.id === p.sub)!;
    types.set(`${sub.name.bg} / ${sub.name.en}`, (types.get(`${sub.name.bg} / ${sub.name.en}`) ?? 0) + 1);
  }
  return [
    `Brand: ${name}`,
    manufacturer.length ? `Facts about the brand (Bulgarian, from another shop's descriptions):\n${manufacturer.join("\n")}` : "",
    facts.length ? `Facts about the brand (from a web search):\n${facts.map((f) => `- ${f.fact}`).join("\n")}` : "",
    !manufacturer.length && !facts.length ? "No facts about the brand are known: write only about the products." : "",
    `The shop carries ${items.length} products of this brand: ${[...types].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n})`).join(", ")}`,
    `For example: ${items.slice(0, 12).map((p) => p.name.en).join("; ")}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ── Run ──

const hash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 16);

async function main() {
  loadEnv();
  mkdirSync(path.dirname(FACTS), { recursive: true });
  const products = JSON.parse(readFileSync(path.join(ROOT, "src", "data", "catalog.json"), "utf8")) as Product[];
  const details = JSON.parse(readFileSync(path.join(ROOT, "src", "data", "details.json"), "utf8")) as Record<string, ProductDetails>;
  const pages = JSON.parse(readFileSync(path.join(ROOT, "data", "sexwell", "pages.json"), "utf8")) as Record<string, SexwellEntry>;
  const intros: Intros = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { subs: {}, brands: {} };
  const facts: Record<string, Fact[]> = existsSync(FACTS) ? JSON.parse(readFileSync(FACTS, "utf8")) : {};

  type Job = { key: string; run: () => Promise<void> };
  const jobs: Job[] = [];
  for (const cat of CATEGORIES) {
    for (const sub of cat.subs) {
      const key = `${cat.id}/${sub.id}`;
      const items = products.filter((p) => p.category === cat.id && p.sub === sub.id);
      if (!items.length || (ONLY && !ONLY.includes(`sub:${key}`))) continue;
      const brief = subBrief(cat, sub.id, items, details);
      if (!ONLY && intros.subs[key]?.source === hash(brief)) continue;
      jobs.push({ key: `sub:${key}`, run: async () => void (intros.subs[key] = { source: hash(brief), ...(await write(SUB_INSTRUCTIONS, brief)) }) });
    }
  }
  const byBrand = new Map<string, Product[]>();
  for (const p of products) if (p.brandSlug && !NO_INTRO.has(p.brandSlug)) byBrand.set(p.brandSlug, [...(byBrand.get(p.brandSlug) ?? []), p]);
  for (const [slug, items] of byBrand) {
    if (ONLY && !ONLY.includes(`brand:${slug}`)) continue;
    const manufacturer = manufacturerTexts(items, pages);
    jobs.push({
      key: `brand:${slug}`,
      run: async () => {
        if (!manufacturer.length && !facts[slug]) facts[slug] = await research(items[0].brand, items.slice(0, 5).map((p) => p.name.en));
        const brief = brandBrief(items[0].brand, items, manufacturer, manufacturer.length ? [] : (facts[slug] ?? []));
        if (!ONLY && intros.brands[slug]?.source === hash(brief)) return;
        intros.brands[slug] = { source: hash(brief), ...(await write(BRAND_INSTRUCTIONS, brief)) };
      },
    });
  }
  console.log(`${jobs.length} pages to check`);

  let fatal: FatalApiError | undefined;
  let failed = 0;
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: 12 }, async () => {
      for (let job = queue.shift(); job && !fatal; job = queue.shift()) {
        try {
          await job.run();
        } catch (err) {
          if (err instanceof FatalApiError) fatal = err;
          else {
            failed++;
            console.warn(`  ${job.key}: ${(err as Error).message.slice(0, 200)}`);
          }
        }
      }
    }),
  );
  writeFileSync(OUT, JSON.stringify(intros, null, 1) + "\n");
  writeFileSync(FACTS, JSON.stringify(facts, null, 2) + "\n");
  if (fatal) {
    console.error(`✗ Stopped: ${fatal.message}`);
    process.exitCode = 1;
  }
  console.log(`✓ ${Object.keys(intros.subs).length} subcategory and ${Object.keys(intros.brands).length} brand texts, ${failed} failed · ${tokenLine()}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
