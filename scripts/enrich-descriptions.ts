// Writes an original Bulgarian and English description for every product with the OpenAI API, from the product's
// sexwell.bg page (data/sexwell/pages.json, made by `npm run sexwell`), and reads its specs. The text is rewritten, not
// translated sentence by sentence, and every result is checked before it is kept:
//   - no run of 8 words copied from the source text,
//   - no number that is not in the source (no invented sizes or battery times),
//   - no mention of sexwell or other shops.
// A result that fails is asked for again once with the problem explained; what still fails is listed in
// data/descriptions/review.json. Products that are not on sexwell.bg get a shorter description written only from their
// name, brand and category, without any specific claim.
//
//   npm run enrich                          (products without a description, or whose source changed)
//   npm run enrich -- --limit 20            (only 20, for a test)
//   npm run enrich -- --only Dilon-302997   (comma-separated SKUs)
//   npm run enrich -- --model gpt-5.5 --concurrency 8   (the defaults)
//   npm run enrich -- --recheck             (only run the checks again on the saved texts, no API calls)
//
// Needs OPENAI_API_KEY in .env.local. Results: data/descriptions/descriptions.json, used by `npm run import`.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CATEGORY_BY_ID, findSub } from "../src/lib/taxonomy";
import { FLAG_KEYS, type FlagKey, type Product, type ProductCopy, SPEC_KEYS, type SpecKey } from "../src/lib/types";
import { FatalApiError, loadEnv, respond, tokenLine } from "./openai";
import type { SexwellEntry } from "./sexwell-fetch";

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const MODEL = arg("--model") ?? "gpt-5.5";
const CONCURRENCY = Number(arg("--concurrency") ?? 8);
const LIMIT = Number(arg("--limit") ?? Infinity);
const ONLY = arg("--only")?.split(",").map((s) => s.trim());
const PAGES = path.resolve(arg("--pages") ?? path.join(ROOT, "data", "sexwell", "pages.json"));
const OUT = path.resolve(arg("--out") ?? path.join(ROOT, "data", "descriptions", "descriptions.json"));
const REVIEW = path.join(path.dirname(OUT), "review.json");

export type StoredDescription = {
  /** Hash of the source the text was written from; a changed source is rewritten on the next run. */
  source: string;
  /** "sexwell": rewritten from the sexwell.bg description; "name": written from the name, brand and category only. */
  basis: Source["basis"];
  model: string;
  created: string;
  bg: ProductCopy;
  en: ProductCopy;
  specs: { key: SpecKey; bg: string; en: string }[];
  flags: FlagKey[];
};

// ── Prompt ──

const INSTRUCTIONS = `You write product pages for "Кадифе" (Kadife), a discreet, elegant Bulgarian online shop for adult products (18+). You get the description of one product from another shop. Write ORIGINAL copy for our shop in Bulgarian and in English.

Originality (most important):
- Rewrite completely: your own structure, sentences and word choice. Do not copy any sentence or distinctive phrase, and do not follow the source sentence by sentence. A plagiarism checker must not match your text to the source.
- The English text is written for English readers, not a word-for-word translation of your Bulgarian.

Facts:
- Use only facts given in the source and in the product data. Never invent dimensions, materials, functions, numbers, certifications, battery times or health effects. When the source does not say something, leave it out.
- Keep numbers exactly as in the source (Bulgarian decimal comma "3,4 см", English decimal point "3.4 cm"). Metric units only.
- Leave out the other shop entirely: its name, its "advice", prices, discounts, gifts, delivery, availability, reviews, links, and any long story about the manufacturer (at most one short sentence about the brand).
- No medical promises beyond what the source states; never claim to cure or treat anything.

Tone:
- Warm, confident and frank, never vulgar or crude, never cheesy. Short sentences, concrete benefits, no exclamation marks, no clichés like "незабравимо изживяване" / "unforgettable experience", no emoji.
- Bulgarian: natural modern Bulgarian, polite plural form ("изберете", "ще усетите"), lower-case "вие/ви". Correct grammar, full articles (пълен/кратък член), Bulgarian quotes „…“.
- English: natural British English (colour, centre), "you".
- Refer to the product by its type or name; use the English product name in English.

Output fields (both languages):
- lead: one or two sentences (max 220 characters) that make the product clear and appealing.
- body: 2–3 short paragraphs (together 70–170 words): what it is, how it feels or works, who it suits, practical use. Fewer when the source is thin; never pad with generic filler.
- highlights: 3–6 short bullet points (max 70 characters each) with the most useful concrete facts (size, material, power, functions, waterproofing, what is included). No full stops at the end.
- care: one or two sentences on cleaning, storage or the right lubricant, only when the source covers it; otherwise "".
- specs: structured facts from the source, each key at most once, value in Bulgarian and English (max 60 characters, several values separated by " / "):
  length (overall length), insertable (insertable length), diameter, width, size (clothing size or fit), weight, volume, count (pieces in the pack), material, colour, power (batteries or USB charging), charging (charging time), runtime (time of use), modes (number of vibration modes, speeds or functions), waterproof (e.g. "IPX7" / "водоустойчив"), noise, includes (what is in the box). Only keys with a stated value; skip the rest.
- flags: features the source clearly states: rechargeable (built-in rechargeable battery), waterproof, app (controlled by a phone app), remote (remote control), warming, cooling, suction (has a suction-cup base; not for air-pulse toys), waterBased / siliconeBased (lubricant base), silicone / glass / metal / leather / lace (main material), vegan, vibration (it vibrates).`;

// Bump when NAME_ONLY changes: descriptions written from the name are then rewritten on the next run.
const NAME_ONLY_VERSION = 2;
const NAME_ONLY = `There is no source description for this product. Write a short, honest description from the product name, brand, category and source specs only:
- Write like a knowledgeable shop assistant: what the product is, what it is for, how this kind of product is used, and what the given facts mean for the buyer.
- Do not state any material, size, function, effect or feature that is not in the product name or the source specs.
- Never talk about the name, the category, the specs or missing information (no "as the name says", "clearly named", "in this category", "where provided").
- lead: one sentence.
- body: one or two short paragraphs (together 40–100 words).
- highlights: 2–4 concrete points from the name, brand and source specs. Never the category itself, never generic points such as "for solo or partner play".
- care: "".
- specs and flags: only what the product name or the source specs state.`;

/** What a description is written from. */
export type Source = { basis: "sexwell" | "name"; text: string; specs: [string, string][] };

export function sourceFor(page: SexwellEntry | undefined): Source {
  const found = page?.found ? page : undefined;
  if (found && found.text.length >= 60) return { basis: "sexwell", text: found.text, specs: found.specs };
  return { basis: "name", text: "", specs: found?.specs ?? [] };
}

const COPY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["lead", "body", "highlights", "care"],
  properties: {
    lead: { type: "string" },
    body: { type: "array", items: { type: "string" } },
    highlights: { type: "array", items: { type: "string" } },
    care: { type: "string" },
  },
};
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["bg", "en", "specs", "flags"],
  properties: {
    bg: COPY_SCHEMA,
    en: COPY_SCHEMA,
    specs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "bg", "en"],
        properties: { key: { type: "string", enum: SPEC_KEYS }, bg: { type: "string" }, en: { type: "string" } },
      },
    },
    flags: { type: "array", items: { type: "string", enum: FLAG_KEYS } },
  },
};

const copyShape = z.object({
  lead: z.string().trim().min(20).max(320),
  body: z.array(z.string().trim().min(20)).min(1).max(4),
  highlights: z.array(z.string().trim().min(2).max(110)).max(8),
  care: z.string().trim().max(500),
});
const resultShape = z.object({
  bg: copyShape,
  en: copyShape,
  specs: z.array(z.object({ key: z.enum(SPEC_KEYS), bg: z.string().trim().min(1).max(120), en: z.string().trim().min(1).max(120) })),
  flags: z.array(z.enum(FLAG_KEYS)),
});
type Result = z.infer<typeof resultShape>;

function productBrief(p: Product, source: Source): string {
  const category = CATEGORY_BY_ID.get(p.category)!;
  const sub = findSub(p.category, p.sub)!;
  return [
    `Product name (Bulgarian): ${p.name.bg}`,
    `Product name (English): ${p.name.en}`,
    p.brand ? `Brand: ${p.brand}` : "",
    `Category: ${category.name.bg} › ${sub.name.bg} (${category.name.en} › ${sub.name.en})`,
    "",
    "Source specs:",
    ...(source.specs.length ? source.specs.map(([k, v]) => `- ${k}: ${v}`) : ["(none)"]),
    "",
    ...(source.basis === "sexwell" ? ["Source description (Bulgarian, from another shop):", source.text] : [NAME_ONLY]),
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}

// ── Checks ──

const wordsOf = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(" ").filter(Boolean);

/** Runs of `n` words that the text shares with the source. */
function copiedRuns(text: string, source: string, n = 8): string[] {
  const src = wordsOf(source);
  const seen = new Set<string>();
  for (let i = 0; i + n <= src.length; i++) seen.add(src.slice(i, i + n).join(" "));
  const out: string[] = [];
  const w = wordsOf(text);
  for (let i = 0; i + n <= w.length; i++) {
    if (!seen.has(w.slice(i, i + n).join(" "))) continue;
    // Report the whole copied stretch once.
    let end = i + n;
    while (end < w.length && seen.has(w.slice(end - n + 1, end + 1).join(" "))) end++;
    out.push(w.slice(i, end).join(" "));
    i = end - 1;
  }
  return out;
}

/** Numbers as written, "3,4" and "3.4" alike. */
const numbersOf = (s: string) => [...s.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => String(Number(m[0].replace(",", "."))));

// Numbers the source writes as words ("седемте режима", "three speeds") may be written as digits in the new text.
const NUMBER_WORDS: [RegExp, number][] = [
  [/^(един|една|едно|единия|единият|one)$/, 1], [/^(два|две|двата|двете|two)$/, 2], [/^(три|трите|three)$/, 3],
  [/^(четири|четирите|four)$/, 4], [/^(пет|петте|five)$/, 5], [/^(шест|шестте|six)$/, 6], [/^(седем|седемте|seven)$/, 7],
  [/^(осем|осемте|eight)$/, 8], [/^(девет|деветте|nine)$/, 9], [/^(десет|десетте|ten)$/, 10],
  [/^(дванадесет|дванайсет|twelve)$/, 12], [/^(двадесет|двайсет|twenty)$/, 20],
];
const spelledNumbers = (s: string) => wordsOf(s).flatMap((w) => NUMBER_WORDS.filter(([re]) => re.test(w)).map(([, n]) => String(n)));

function problems(r: Result, p: Product, source: Source): string[] {
  const out: string[] = [];
  const facts = `${source.text}\n${source.specs.map(([k, v]) => `${k} ${v}`).join("\n")}\n${p.name.bg}\n${p.name.en}\n${p.brand}`;
  const allowed = new Set([...numbersOf(facts), ...spelledNumbers(facts)]);
  const prose = (c: ProductCopy) => [c.lead, ...c.body, c.care].join("\n");
  const everything = [prose(r.bg), prose(r.en), ...r.bg.highlights, ...r.en.highlights, ...r.specs.flatMap((s) => [s.bg, s.en])].join("\n");

  const copied = copiedRuns(prose(r.bg), source.text);
  if (copied.length) out.push(`These phrases are copied from the source, rewrite them: ${copied.map((c) => `"${c}"`).join(", ")}`);
  // 18 (adults only) and 1 / 2 ("2 in 1", "one or two") are common in honest copy without being product facts.
  const invented = [...new Set(numbersOf(everything))].filter((n) => !allowed.has(n) && !["1", "2", "18"].includes(n));
  if (invented.length) out.push(`These numbers are not in the source, remove them or use the source's numbers: ${invented.join(", ")}`);
  // Sexwell is also a brand of its own ("Пенис маншон Sexwell Cage"); then its name belongs in the text.
  if (/sexwell|сексуел/i.test(everything) && !/sexwell/i.test(`${p.name.bg} ${p.brand}`)) out.push("Do not mention sexwell or any other shop.");
  if (r.bg.body.join(" ").split(/\s+/).length > 230 || r.en.body.join(" ").split(/\s+/).length > 230) out.push("The body is too long; keep it under 170 words.");
  return out;
}

// ── API ──

async function ask(input: string): Promise<Result> {
  const text = await respond({
    model: MODEL,
    instructions: INSTRUCTIONS,
    input,
    reasoning: { effort: "low" },
    text: { format: { type: "json_schema", name: "product_copy", strict: true, schema: SCHEMA } },
    max_output_tokens: 12000,
  });
  return resultShape.parse(JSON.parse(text));
}

const tidy = (s: string) => s.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
function clean(r: Result): Omit<StoredDescription, "source" | "basis" | "model" | "created"> {
  const copy = (c: ProductCopy): ProductCopy => ({
    lead: tidy(c.lead),
    body: c.body.map(tidy).filter(Boolean),
    highlights: c.highlights.map((h) => tidy(h).replace(/[.;]$/, "")).filter(Boolean),
    care: tidy(c.care),
  });
  const keys = new Set<SpecKey>();
  return {
    bg: copy(r.bg),
    en: copy(r.en),
    specs: r.specs
      .filter((s) => !keys.has(s.key) && keys.add(s.key))
      .sort((a, b) => SPEC_KEYS.indexOf(a.key) - SPEC_KEYS.indexOf(b.key))
      .map((s) => ({ key: s.key, bg: tidy(s.bg), en: tidy(s.en) })),
    flags: [...new Set(r.flags)],
  };
}

// Written from the name only: the category is part of the source too, a product moved to another category is rewritten.
export const sourceHash = (p: Pick<Product, "name" | "brand" | "category" | "sub">, source: Source) =>
  createHash("sha1")
    .update(
      JSON.stringify(
        source.basis === "sexwell"
          ? [p.name.bg, p.name.en, p.brand, source.specs, source.text]
          : [p.name.bg, p.name.en, p.brand, source.specs, p.category, p.sub, NAME_ONLY_VERSION],
      ),
    )
    .digest("hex")
    .slice(0, 16);

async function describe(p: Product, source: Source): Promise<{ result: StoredDescription; issues: string[] }> {
  const brief = productBrief(p, source);
  let r = await ask(brief);
  let issues = problems(r, p, source);
  if (issues.length) {
    const retry = await ask(`${brief}\n\nYour previous answer had problems. Write it again and fix them:\n- ${issues.join("\n- ")}`);
    const retryIssues = problems(retry, p, source);
    if (retryIssues.length <= issues.length) [r, issues] = [retry, retryIssues];
  }
  return { result: { source: sourceHash(p, source), basis: source.basis, model: MODEL, created: new Date().toISOString(), ...clean(r) }, issues };
}

async function main() {
  loadEnv();
  mkdirSync(path.dirname(OUT), { recursive: true });
  const products = JSON.parse(readFileSync(path.join(ROOT, "src", "data", "catalog.json"), "utf8")) as Product[];
  const pages = JSON.parse(readFileSync(PAGES, "utf8")) as Record<string, SexwellEntry>;
  const store: Record<string, StoredDescription> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  const review: Record<string, string[]> = existsSync(REVIEW) ? JSON.parse(readFileSync(REVIEW, "utf8")) : {};
  for (const d of Object.values(store)) d.basis ??= "sexwell"; // written before descriptions from the name existed

  if (args.includes("--recheck")) {
    for (const key of Object.keys(review)) delete review[key];
    for (const p of products) {
      const d = store[p.sku];
      if (!d || !pages[p.sku]) continue;
      const issues = problems(d, p, sourceFor(pages[p.sku]));
      if (issues.length) review[p.sku] = issues;
    }
    writeFileSync(REVIEW, JSON.stringify(review, null, 2) + "\n");
    console.log(`✓ ${Object.keys(review).length} saved descriptions with a problem — see ${path.relative(ROOT, REVIEW)}`);
    return;
  }

  const todo = products
    .filter((p) => !ONLY || ONLY.includes(p.sku))
    .flatMap((p) => {
      // Not looked up on sexwell.bg yet: wait for `npm run sexwell` instead of writing a weaker description.
      if (!pages[p.sku]) return [];
      const source = sourceFor(pages[p.sku]);
      return store[p.sku]?.source === sourceHash(p, source) ? [] : [{ p, source }];
    })
    .slice(0, LIMIT);
  console.log(`${todo.length} products to describe with ${MODEL}`);

  let done = 0;
  let failed = 0;
  let fatal: FatalApiError | undefined;
  let lastSave = Date.now();
  const save = () => {
    writeFileSync(OUT, JSON.stringify(store, null, 1) + "\n");
    writeFileSync(REVIEW, JSON.stringify(review, null, 2) + "\n");
  };
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let job = queue.shift(); job && !fatal; job = queue.shift()) {
        try {
          const { result, issues } = await describe(job.p, job.source);
          store[job.p.sku] = result;
          if (issues.length) review[job.p.sku] = issues;
          else delete review[job.p.sku];
        } catch (err) {
          if (err instanceof FatalApiError) {
            fatal = err;
            break;
          }
          failed++;
          console.warn(`  ${job.p.sku}: ${(err as Error).message.slice(0, 300)}`);
        }
        if (++done % 25 === 0) console.log(`  ${done}/${todo.length} · ${tokenLine()}`);
        if (Date.now() - lastSave > 15_000) {
          save();
          lastSave = Date.now();
        }
      }
    }),
  );
  save();
  if (fatal) {
    console.error(`\n✗ Stopped: ${fatal.message}`);
    console.error(`  ${done - failed} described before that; run \`npm run enrich\` again to continue where it stopped.`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${done - failed} described, ${failed} failed · ${tokenLine()}`);
  console.log(`  ${Object.keys(review).length} kept with a problem the retry did not fix — see ${path.relative(ROOT, REVIEW)}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
