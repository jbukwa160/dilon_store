// Rules that pick the adult products out of the company-wide export and sort them into the shop's categories.
// Product names in the export are Bulgarian and usually start with the product type ("Анален разширител ...",
// "Лубрикант pjur ..."), so the category comes from the type word that appears first in the name.

import type { AudienceId } from "../src/lib/taxonomy";
import type { Feature, FeatureKey } from "../src/lib/types";

export type CsvRow = {
  SKU: string;
  Name: string;
  EAN: string;
  Brand: string;
  Category: string;
  "Product Type": string;
  Inventory: string;
  Reserved: string;
  Status: string;
  Weight: string;
  Color: string;
  "HS Code": string;
  "Image URL": string;
  Created: string;
  Updated: string;
};

// JavaScript's \b only knows ASCII letters, so it never matches next to Cyrillic. Rewrite it Unicode-aware.
const UB = "(?:(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}])|(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}]))";
export const rx = (source: string) => new RegExp(source.replaceAll("\\b", UB), "iu");
const any = (parts: string[]) => rx(parts.join("|"));

// ── Which rows are adult products ──

const ADULT_SOURCE_CATEGORY = /sexual|sex accessoires|vibrating egg/i;
const ADULT_IMAGE_HOST = /(^|\/\/|\.)sexwellshop\.com\//i;
const ADULT_BRANDS = new Set(
  [
    "ouch!", "ns novelties", "california exotic", "california exotics", "pipedream", "dream toys", "tenga", "you 2 toys",
    "satisfyer", "blush", "hidden desire", "system jo", "cottelli collection", "guilty pleasure", "loveline", "toyjoy",
    "toyjoy classics", "shots toys", "shots", "fun factory", "dolphi", "calvin's condoms", "pjur", "xr brands", "doc johnson",
    "femmefunn", "wicked", "xocoon", "dorcel", "b-vibe", "strap on me", "orgie", "just glide", "mixgliss", "sportsheets",
    "joydivision", "curve toys", "la nua", "buttr", "jimmyjane", "love to love", "pillow talk", "svakom", "lovense",
    "leg avenue", "obsessive", "baci", "eye of love", "le desir", "rene rofe", "kinky diva", "magic motion", "sexwell",
    "little genie productions", "spencer fleetwood", "sevencreations", "autoblow", "fetish collection", "ann devine",
    "bad kitty", "taboom", "zero tolerance", "mister b", "my.size", "nature skin", "private", "selopa", "anos", "boo",
  ],
);

/** Words that only appear in names of adult products. Used for rows outside the adult source categories. */
const ADULT_NOUN = any([
  "вибратор", "виброяйце", "вибро ?яйце", "виброкуршум", "дилдо", "dildo", "мастурбатор", "анален разширител",
  "анални? (?:топчета|броеница|дилдо|вибратор|лубрикант)", "пенис (?:ринг|помпа|маншон|колан|удължител|пристегач)",
  "страпон", "strap-?on", "клиторстимулатор", "стимулатор за клитор", "вагинални топчета", "лубрикант", "презерватив",
  "белезници", "\\bbdsm\\b", "фетиш", "еротичн", "секс (?:играчк|игр|машин|кукл|люлк|зар)", "щипки за зърна",
  "наустник", "камшик", "нагайка", "феромон", "афродизиак", "испанска муха", "простатен (?:стимулатор|вибратор)",
  "прашк[аи] с (?:перли|отворено)", "отворено дъно", "секси",
]);

/** Look-alikes that must never be imported (baby goods, pharmacy, electronics that share words with adult products). */
const NOT_ADULT = any([
  "бебе", "бебеш", "детск", "унисекс", "спално бельо", "\\btena\\b", "therabody", "fisher ?price", "playgro", "овул",
  "вагинален крем", "вагинална флора", "флора", "пробиоти", "синбиоти", "хемороид", "компреси", "аналгин", "аналогов",
  "voip", "гейтуей", "grandstream", "виброцил", "\\bbach\\b", "слушалки", "микрофон", "енкодер", "\\bpelco\\b", "\\bdiva\\b",
  "ostrovit", "простата и", "за простатата", "за здрава простата", "тест ", "револвер", "кобур", "антивибратор", "djokovic",
  "\\bnici\\b", "гушкане", "есенция", "книга", "корица",
]);

/** Free gifts that sexwellshop adds to orders. They are not for sale. */
const GIFT = /ПОДАРЪК|\bgift\b|ваучер|voucher|^подарък/iu;

export type Rejection = "inactive" | "pack" | "no-image" | "not-adult" | "gift" | "unclassified";

export function selectRow(r: CsvRow): Rejection | null {
  const name = r.Name ?? "";
  const brand = (r.Brand ?? "").trim().toLowerCase();
  const adult =
    ADULT_SOURCE_CATEGORY.test(r.Category) ||
    ADULT_IMAGE_HOST.test(r["Image URL"]) ||
    ADULT_BRANDS.has(brand) ||
    ADULT_NOUN.test(name);
  if (!adult || NOT_ADULT.test(name)) return "not-adult";
  if (r.Status !== "Active") return "inactive";
  if (r["Product Type"] === "pack" || /^pack\b/i.test(name) || /^\d+\s*x\s/i.test(name) || /^\d+x/i.test(r.SKU)) return "pack";
  if (GIFT.test(name)) return "gift";
  if (!imageUrl(r)) return "no-image";
  return null;
}

/** The export joins several pictures with "$$$". The first valid http(s) URL is used. */
export function imageUrl(r: CsvRow): string | null {
  for (const part of (r["Image URL"] ?? "").split("$$$")) {
    const u = part.trim();
    if (/^https?:\/\/[^\s]+$/i.test(u)) return u.replace(/^http:\/\//i, "https://");
  }
  return null;
}

// ── Name clean-up ──

const TYPOS: [RegExp, string][] = [
  [/Мстурбатор/g, "Мастурбатор"],
  [/дидло/gi, "дилдо"],
  [/Ключодържатал/g, "Ключодържател"],
  [/Матални нокти/g, "Метални нокти"],
  [/Гащиризон/g, "Гащеризон"],
  [/клит\.\s?стим(?:улатор|\.)?/gi, "клиторен стимулатор"],
  [/(^|\s)стим\.(?=\s|$)/g, "$1стимулатор"],
  [/\s+,/g, ","],
  [/,(?=\S)/g, ", "],
  [/\s{2,}/g, " "],
];

const LATIN_TO_CYRILLIC: Record<string, string> = {
  a: "а", c: "с", e: "е", o: "о", p: "р", x: "х", y: "у", A: "А", C: "С", E: "Е", O: "О", P: "Р", X: "Х", T: "Т", H: "Н",
  K: "К", M: "М", B: "В",
};
const CYRILLIC_TO_LATIN = Object.fromEntries(Object.entries(LATIN_TO_CYRILLIC).map(([lat, cyr]) => [cyr, lat]));

/** A word typed with look-alike letters from the other alphabet ("куклa", "Sеx") is rewritten in its main alphabet. */
export function fixMixedScript(text: string): string {
  return text.replace(/\p{L}+/gu, (w) => {
    const cyr = (w.match(/\p{Script=Cyrillic}/gu) ?? []).length;
    const lat = (w.match(/[A-Za-z]/g) ?? []).length;
    if (!cyr || !lat) return w;
    return cyr >= lat
      ? w.replace(/[A-Za-z]/g, (ch) => LATIN_TO_CYRILLIC[ch] ?? ch)
      : w.replace(/\p{Script=Cyrillic}/gu, (ch) => CYRILLIC_TO_LATIN[ch] ?? ch);
  });
}

export function cleanName(raw: string): string {
  let name = raw.replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/[ \t]/g, " ").trim();
  // Some names are the same text twice in a row.
  const words = name.split(" ");
  if (words.length % 2 === 0) {
    const half = words.length / 2;
    if (words.slice(0, half).join(" ") === words.slice(half).join(" ")) name = words.slice(0, half).join(" ");
  }
  name = fixMixedScript(name);
  // FULL-CAPS Cyrillic words ("ПРЕЗЕРВАТИВ Класик") become lower case; Latin model names stay as they are.
  name = name.replace(/[А-ЯЁЪЬЮЯЩЧШЦЖ]{2,}/gu, (w) => w.toLowerCase());
  for (const [from, to] of TYPOS) name = name.replace(from, to);
  name = name.trim().replace(/[,;.\s]+$/, "");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ── Brands ──

/** Brand names written in the product name win over the Brand column (the column is wrong for some rows). */
const BRAND_IN_NAME: [RegExp, string][] = [
  [rx("\\britex\\b|\\bритекс\\b"), "Ritex"],
  [rx("\\bdurex\\b|\\bдюрекс\\b"), "Durex"],
  [rx("\\bone touch\\b"), "One Touch"],
  [rx("\\btenga\\b"), "Tenga"],
  [rx("\\bsatisfyer\\b"), "Satisfyer"],
  [rx("\\bpjur\\b"), "Pjur"],
  [rx("\\blovense\\b"), "Lovense"],
  [rx("\\bdorcel\\b"), "Dorcel"],
  [rx("\\bsexwell\\b"), "Sexwell"],
  [rx("\\bfifty shades\\b"), "Fifty Shades of Grey"],
  [rx("\\bbioglide\\b|\\baqua glide\\b"), "Joydivision"],
  [rx("\\bmixgliss\\b"), "Mixgliss"],
  [rx("\\bfetish fantasy\\b|\\bpdx\\b|\\bking cock\\b|\\bfuck-o-matic\\b"), "Pipedream"],
  [rx("\\bsystem jo\\b|\\bjo gelato\\b"), "System JO"],
  [rx("\\bfun ?factory\\b"), "Fun Factory"],
  [rx("\\bwe-vibe\\b"), "We-Vibe"],
  [rx("\\bwomanizer\\b"), "Womanizer"],
  [rx("\\blelo\\b"), "LELO"],
  [rx("\\bmy ?size\\b"), "MY.SIZE"],
  [rx("\\bsecura\\b"), "Secura"],
  [rx("\\bplayboy\\b"), "Playboy"],
  [rx("\\bmr\\.? dixx\\b"), "Dream Toys"],
  [rx("\\bbad kitty\\b"), "Bad Kitty"],
  [rx("\\bsvakom\\b"), "Svakom"],
  [rx("\\btoy ?joy\\b"), "ToyJoy"],
  [rx("\\bouch!?\\b"), "Ouch!"],
];

const BRAND_DISPLAY: Record<string, string> = {
  "ouch!": "Ouch!", "ouch": "Ouch!", "ns novelties": "NS Novelties", "california exotic": "California Exotics",
  "california exotics": "California Exotics", "you 2 toys": "You2Toys", "system jo": "System JO",
  "toyjoy": "ToyJoy", "toyjoy classics": "ToyJoy", "shots toys": "Shots", "shots": "Shots", "calvin's condoms": "Calvin's Condoms",
  "xr brands": "XR Brands", "femmefunn": "FemmeFunn", "b-vibe": "b-Vibe", "strap on me": "Strap-on-me", "la nua": "La Nua",
  "buttr": "BUTTR", "sevencreations": "Seven Creations", "le desir": "Le Désir", "rene rofe": "René Rofé", "my.size": "MY.SIZE",
  "multi-gym": "Multi-Gyn", "nmc": "NMC", "mai": "MAI", "anos": "ANOS", "s8": "S8", "adam & eve": "Adam & Eve", "jimmyjane": "Jimmyjane",
  "mister b": "Mister B", "joydivision": "Joydivision", "femmefun / la nua": "La Nua", "eye of love": "Eye of Love",
  "love to love": "Love to Love", "lg games": "LG Games", "stimul8 s8": "S8", "le wand": "Le Wand", "lelo": "LELO", "lovense": "Lovense", "durex": "Durex", "pjur": "Pjur", "tenga": "Tenga",
};

const GENERIC_BRANDS = new Set([
  "", "#n/a", "none", "other brands", "generic", "no brand", "unbranded", "0", "фъстъчено", "unknown", "vip", "wh", "bdsm", "battery",
  "relax", "head",
]);
/** Brands in the column that are known to be wrong for adult rows (pharmacy wholesalers, tea, etc.). */
const WRONG_BRANDS = new Set([
  "bulgarian tea company", "bioconcept", "reckitt benckiser", "ssl international", "montavit", "casa santona",
  "fabrica de conservas a poveira s.a.", "decalgirl", "doctor's best", "tunewear", "nutrend", "natural factors",
]);

export function brandKey(column: string): string {
  return fixMixedScript(column.replace(/&#39;/g, "'").replace(/&amp;/g, "&")).trim().toLowerCase();
}

/**
 * Brand shown in the shop. `trustColumn` is false when the import found that the column's brand is mostly used on
 * non-adult products in the export (e.g. "Apple" on a dildo), so it is a data-entry mistake.
 */
export function canonicalBrand(column: string, name: string, trustColumn = true): string {
  for (const [re, brand] of BRAND_IN_NAME) if (re.test(name)) return brand;
  const key = brandKey(column);
  if (!trustColumn || GENERIC_BRANDS.has(key) || WRONG_BRANDS.has(key)) return "";
  if (BRAND_DISPLAY[key]) return BRAND_DISPLAY[key];
  // "DREAM TOYS" / "Dream toys" -> "Dream Toys" (but "Ballerina's", not "Ballerina'S")
  return key.replace(/(^|[\s\-&./])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

// ── Product type → category ──

type TypeKey =
  | "kit" | "chastity" | "condom" | "lube" | "massage" | "cosmetic" | "perfume" | "pills" | "hygiene" | "accessory"
  | "vibrator" | "kegel" | "dildo" | "plug" | "prostate" | "masturbator" | "ring" | "pump" | "doll" | "strap"
  | "game" | "machine" | "cuffs" | "mask" | "whip" | "gag" | "clamp" | "sensation" | "electro" | "collar" | "bdsm" | "lingerie";

// The type whose word appears first in the name wins. Order here matters only for ties (same position).
const TYPE_WORDS: [TypeKey, RegExp][] = [
  ["kit", any(["комплект (?:секс )?играчки", "кутия за удоволствия", "комплект за удоволствия?", "подаръчен комплект", "празничен комплект", "комплект за баня", "комплект св\\.", "комплект влюбена", "комплект бяла", "комплект цветна", "комплект нежна", "комплект glam", "комплект секс", "луксозен комплект за баня"])],
  ["chastity", any(["клетка за пенис", "пенис клетка", "chastity", "колан за целомъдрие"])],
  ["condom", any(["презерватив", "condom", "презерв\\."])],
  ["lube", any(["лубрикант", "lubricant", "\\blube\\b", "глайтгел", "гел за играчки", "\\bglide\\b", "bioglide", "\\bjo gelato\\b", "лубрикиращ", "\\blotion\\b", "фистинг гел"])],
  ["massage", any(["масаж(?!ор)\\p{L}*", "massage(?!r)", "\\bолио\\b", "масажна свещ"])],
  ["perfume", any(["феромон\\p{L}*", "pheromon", "парфюм", "perfume", "\\bмист\\b"])],
  ["pills", any(["афродизиак", "възбуждащ\\p{L}* (?:мед|напитка)", "\\bмед\\b", "напитка", "\\bтабл\\b", "тинктура", "таблет\\p{L}*", "капсул\\p{L}*", "хапче", "\\bshot\\b", "ликвид", "сироп", "добавка", "капки за пиене"])],
  ["hygiene", any(["почистващ\\p{L}*", "\\bcleaner\\b", "интимн\\p{L}* (?:емулсия|гел|кърпи|сапун|душ)", "тампон\\p{L}*", "менструал\\p{L}*", "\\bклизма\\b", "\\bпудра\\b", "\\bсапун\\b", "мрежа за пране"])],
  ["cosmetic", any(["\\bгел\\b", "спрей", "серум", "\\bкрем\\b", "капки", "балсам", "мехлем", "пяна", "лосион", "\\bxtend\\b", "\\bdelay\\b", "\\bdrops\\b", "\\bмасл[оа]\\b", "виброгел", "стимулант"])],
  ["accessory", any(["несесер", "торбичка за съхранение", "зарядно", "\\bкабел\\b", "батерии", "\\bcharger\\b", "дръжка за", "кутия за (?:играчки|съхранение)"])],
  ["kegel", any(["вагинал\\p{L}* топч\\p{L}*", "кегел", "kegel", "\\bben ?wa\\b", "вагинално топче", "вибротопч\\p{L}*", "\\bтопче\\b"])],
  ["vibrator", any([
    "вибратор\\p{L}*", "vibrator", "\\bvibe\\b", "виброкуршум", "куршум", "\\bbullet\\b", "масажор", "massager", "\\bwand\\b",
    "клиторстимулатор", "клиторен стимулатор", "клитор стимулатор", "стимулатор(?:-вибратор)? за (?:клитор|вулва)", "стимулатор-вибратор",
    "въздушен стимулатор", "ротиращ стимулатор", "пулсатор", "напръстник", "виброяйце", "вибро ?яйце", "\\begg\\b",
    "\\bяйце\\b", "вибро ?пръст", "\\bvibro\\b", "виброгащички", "вибриращи бикини", "вибростимулатор", "стимулатор\\p{L}*",
    "clitstimulator", "air ?pulse", "climaxer", "multitoy", "\\bg-spot\\b",
  ])],
  ["dildo", any(["дилдо", "дилда", "dildo", "нееректирал пенис", "фалос", "\\bcock\\b", "\\bdong\\b"])],
  ["plug", any(["разширител\\p{L}*", "\\bplug\\b", "\\bтапа\\b", "броеница", "\\bbeads\\b", "дилатор\\p{L}*", "анални топчета", "анална верига", "анален душ", "анален тренировъчен", "виброплъг", "плуг", "интимен душ", "\\bdouche\\b"])],
  ["prostate", any(["простатен", "простатн\\p{L}*", "prostate", "p-точка", "\\bp-spot\\b", "п-стимулатор"])],
  ["masturbator", any(["мастурбатор\\p{L}*", "masturbator", "\\bstroker\\b", "изкуствена вагина", "\\bвагина\\b", "\\bpussy\\b", "\\bанус\\b", "fleshlight", "отливка"])],
  ["ring", any(["пенис ринг", "\\bринг\\b", "рингове", "пръстен\\p{L}*", "\\bring\\b", "cockring", "пристегач", "халка за пенис", "вибро ?ринг", "виброринг", "торбичка за тестиси"])],
  ["pump", any(["помпа", "\\bpump\\b", "удължител", "екстендер", "extender", "маншон", "\\bръкав\\b", "\\bsleeve\\b", "уголемител", "удебелител", "еректор", "hydromax", "bathmate", "maleedge", "помпичк\\p{L}*"])],
  ["doll", any(["секс кукла", "\\bкукла\\b", "\\bdoll\\b"])],
  ["strap", any(["пенис колан", "страпон", "страп-он", "strap-?on", "strapless", "страплес", "харнес", "harness"])],
  ["machine", any(["машина", "\\bmachine\\b", "люлка", "\\bswing\\b", "възглавница", "калъфка за възглавница", "\\bwedge\\b", "мебел", "чаршаф", "плик за завивка", "столче", "\\bchair\\b"])],
  ["cuffs", any(["белезници", "\\bвъже\\b", "\\brope\\b", "ограничител\\p{L}*", "каиши за легло", "hogtie", "бондаж", "bondage", "окови", "спредер", "разтегач", "фиксатор\\p{L}*", "\\bcuffs\\b", "лента за връзване", "тиксо", "за връзване", "въжета", "разкрачващ", "бондидж", "ножици", "кожени гривни", "\\bколан\\b"])],
  ["mask", any(["маска", "маски", "превръзка за очи", "blindfold", "качулка", "\\bhood\\b"])],
  ["whip", any(["камшик", "\\bбич\\b", "\\bпалка\\b", "нагайка", "paddle", "\\bwhip\\b", "flogger", "\\bcrop\\b", "пляскалка"])],
  ["gag", any(["наустник", "топка за уста", "\\bgag\\b", "кляп"])],
  ["clamp", any(["щипки", "clamp", "помпи за зърна", "вакуумни чашки", "нипел\\p{L}*"])],
  ["sensation", any(["зъбчато колело", "колело за удоволствия", "wartenberg", "восъчна свещ", "свещ за секси игри", "свещ за bdsm", "тиклер", "tickler", "\\bперо\\b", "перце", "\\bпера\\b", "feather", "метални нокти", "\\bclaws?\\b"])],
  ["electro", any(["електростимул\\p{L}*", "електрод\\p{L}*", "electro", "e-?stim", "шокова"])],
  ["collar", any(["нашийник", "\\bповод\\b", "collar", "\\bleash\\b", "чокър", "\\bяка\\b"])],
  ["game", any(["\\bигра\\b", "\\bигри\\b", "зарчета", "зарове", "\\bкарти\\b", "\\bgame\\b", "\\bdice\\b", "парти свещи", "бонбон\\p{L}*", "шоколад", "\\bчаша\\b", "сламк\\p{L}*", "звънец", "сувенир", "ключодържател", "мече", "конфети", "купон\\p{L}*", "колело на", "въртележка", "дартс", "календар", "балони", "\\bмагнит\\b", "запалка",
    "играчка -", "отварачка", "форма за печене", "плюшена играчка", "свещ happy", "домино"])],
  ["bdsm", any(["\\bbdsm\\b", "комплект за фетиш", "фетиш", "fetish", "kinky"])],
  ["lingerie", any([
    "\\bбоди\\b", "\\bbody\\b", "бодистокинг", "целокупно", "catsuit", "прашк\\p{L}*", "бикини", "\\bthong\\b", "\\bтанга\\b", "\\bслип\\p{L}*",
    "боксерки", "\\bшорти\\b", "сутиен\\p{L}*", "бюстие", "корсет\\p{L}*", "корсаж", "\\bcorset\\b", "чорап\\p{L}*", "жартиер\\p{L}*", "\\bgarter\\b",
    "stocking", "\\bгети\\b", "бейбидол", "babydoll", "нощничка", "нощница", "\\bchemise\\b", "пеньоар", "халат", "кимоно", "рокля", "туника", "\\bdress\\b",
    "\\bпола\\b", "\\bтоп\\b", "\\bклин\\b", "костюм", "costume", "униформа", "мигли", "ръкавици", "колие", "бижу", "гривна", "пастис\\p{L}*",
    "наколенки", "бельо", "комбинезон", "бански", "lingerie", "аксесоари", "разкриващ комплект", "папийонка", "вратовръзка", "маншети",
    "\\btop\\b", "\\bbra\\b", "гащеризон", "медицинска сестра", "нагръдник", "стикери за зърна", "украшение", "блуза",
  ])],
];

function firstType(name: string): TypeKey | null {
  let best: { key: TypeKey; at: number } | null = null;
  for (const [key, re] of TYPE_WORDS) {
    const m = re.exec(name);
    if (m && (!best || m.index < best.at)) best = { key, at: m.index };
  }
  return best?.key ?? null;
}

const has = (name: string, ...parts: string[]) => any(parts).test(name);

/** First rule whose words match the name; the last entry without words is the default. */
function pick(n: string, rules: [string, string[]][], fallback: string): string {
  for (const [id, words] of rules) if (has(n, ...words)) return id;
  return fallback;
}

export type Placement = { category: string; sub: string };

const LUBE_BRANDS = new Set(["System JO", "Pjur", "Mixgliss", "Just Glide", "Joydivision"]);
const LINGERIE_BRANDS = new Set(["Leg Avenue", "Baci", "Cottelli Collection", "Obsessive", "Le Désir", "René Rofé", "Passion"]);

const ANAL = ["анал\\p{L}*", "\\banal\\b", "back ?door", "analyse", "\\bbutt\\b"];
const PROSTATE = ["простат\\p{L}*", "prostate", "p-точка", "п-стимулатор"];
const COUPLE = ["за двойки", "за двама", "\\bcouples?\\b", "двойк\\p{L}*", "we-vibe", "с пенис ринг", "perfect lover", "partner"];
const VIBRATING = ["вибр\\p{L}*", "\\bvibe\\b", "vibrat\\p{L}*", "вибро", "с дистанционно", "\\bremote\\b"];
const ENHANCE = ["уголем\\p{L}*", "ерекци\\p{L}*", "ерект\\p{L}*", "\\berect\\p{L}*", "penis ?xxl", "\\bxxl\\b", "\\bxxxl\\b", "\\bharder\\b", "потентн\\p{L}*", "потенци\\p{L}*", "дисфункци\\p{L}*", "\\benlarg\\p{L}*"];
const DELAY = ["задърж\\p{L}*", "\\bdelay\\b", "xtend", "xtra time", "retard", "\\bcontrol\\b", "издръжлив\\p{L}*", "longtime", "prolong"];
const SPANISH_FLY = ["испанска муха", "spanish fly"];
const TOY_CARE = ["почист\\p{L}*", "\\bclean\\p{L}*", "\\btoy\\b", "играчк\\p{L}*", "\\bпудра\\b", "powder", "мрежа за пране", "несесер", "торбичка", "кутия", "зарядно", "\\bкабел\\b", "батерии", "charger", "блясък", "\\bshine\\b", "латекс"];
const FLAVOURS = [
  "вкус\\p{L}*", "ягод\\p{L}*", "strawberr\\p{L}*", "череш\\p{L}*", "cherry", "банан\\p{L}*", "\\bbanana\\b", "мента", "\\bmint\\b", "шоколад\\p{L}*",
  "chocolate", "ванили\\p{L}*", "vanilla", "диня", "watermelon", "кокос\\p{L}*", "coconut", "цитрус\\p{L}*", "citrus", "дъвка", "bubble ?gum",
  "gelato", "карамел\\p{L}*", "caramel", "мохито", "mojito", "кайпири\\p{L}*", "tutti", "фрути", "праскова", "peach", "малин\\p{L}*", "raspberr\\p{L}*",
  "ананас", "pineapple", "ябълк\\p{L}*", "\\bapple\\b", "лимон\\p{L}*", "\\blemon\\b", "киви", "трюфел", "truffle", "кафе", "coffee", "сладолед",
  "вишн\\p{L}*", "пина колада", "маракуя", "боровинк\\p{L}*", "blueberr\\p{L}*", "\\bcola\\b", "\\bкола\\b", "\\bkiss\\b", "\\bsweet\\b",
];

export function classify(name: string, brand: string): Placement | null {
  const n = name.toLowerCase();
  let type = firstType(n);
  if (!type && LINGERIE_BRANDS.has(brand)) type = "lingerie";
  if (!type && LUBE_BRANDS.has(brand)) type = "lube";
  if (!type && brand === "Ouch!" && /комплект/iu.test(n)) type = "kit";
  if (!type) return null;

  const anal = has(n, ...ANAL);
  const couple = has(n, ...COUPLE);
  const place = (category: string, sub: string): Placement => ({ category, sub });

  switch (type) {
    case "condom":
      return place(
        "condoms",
        pick(n, [
          ["large-condoms", ["\\bx{1,5}l+\\b", "х{2,5}l", "\\blarge\\b", "\\bking\\b", "\\bbig\\b", "my ?size", "\\b(?:5[7-9]|6\\d|7\\d) ?mm\\b", "\\bmaxi\\b", "голям\\p{L}*", "ххххх"]],
          ["flavored-condoms", ["вкус", "ягод\\p{L}*", "банан", "череш\\p{L}*", "cherry", "flavou?r", "цветн\\p{L}*", "тути", "фрути", "маруя", "мента", "шоколад", "ванили\\p{L}*", "кафе"]],
          ["textured", ["релеф\\p{L}*", "точки", "dotted", "ribbed", "брадавич\\p{L}*", "intense", "mutual", "pleasure", "стимул\\p{L}*", "ребр\\p{L}*", "spike", "тикъл", "tickle", "performa", "extended", "longtime", "издръжлив\\p{L}*", "warming", "затопл\\p{L}*", "3 в 1", "спец форма", "интензив\\p{L}*", "\\bmix\\b", "микс", "колекция", "love stories"]],
          ["ultra-thin", ["тън\\p{L}*", "\\bthin\\b", "\\bfeel\\b", "0[.,]0\\d", "sensitive", "чувствител\\p{L}*", "\\bslim\\b"]],
        ], "classic-condoms"),
      );

    case "lube":
      return place(
        "lube",
        pick(n, [
          ["anal-lube", [...ANAL, "relax"]],
          ["flavored", FLAVOURS],
          ["warming-cooling", ["затопл\\p{L}*", "загрява\\p{L}*", "warming", "\\bheat\\p{L}*", "охлажд\\p{L}*", "cooling", "\\bcool\\b", "\\bice\\b", "леден", "\\bfire\\b", "\\bhot\\b", "tingl\\p{L}*"]],
          ["silicone-based", ["силикон\\p{L}*", "silicone"]],
          ["water-based", ["водна", "\\baqua\\b", "\\bh2o\\b", "water", "hydro"]],
        ], "personal-lubricants"),
      );

    case "massage":
      return place("sexual-wellness", "massage");
    case "perfume":
      return place("sexual-wellness", "pheromones");
    case "pills":
      if (has(n, ...SPANISH_FLY)) return place("sexual-wellness", "spanish-fly");
      if (has(n, ...ENHANCE)) return place("penis-enhancement", "creams-pills");
      return place("sexual-wellness", "supplements");
    case "hygiene":
    case "accessory":
      return place("sexual-wellness", type === "accessory" || has(n, ...TOY_CARE) ? "toy-care" : "intimate-care");
    case "cosmetic":
      if (anal) return place("lube", "anal-lube");
      if (has(n, ...SPANISH_FLY)) return place("sexual-wellness", "spanish-fly");
      if (has(n, ...ENHANCE)) return place("penis-enhancement", "creams-pills");
      if (has(n, "таблет\\p{L}*", "капсул\\p{L}*", "хапче")) return place("sexual-wellness", "supplements");
      if (has(n, ...DELAY)) return place("sexual-wellness", "delay");
      if (has(n, ...TOY_CARE)) return place("sexual-wellness", "toy-care");
      if (has(n, "интимн\\p{L}*", "млечна киселина", "\\bph\\b", "хигиен\\p{L}*", "lactic")) return place("sexual-wellness", "intimate-care");
      return place("sexual-wellness", "arousal");

    case "kegel":
      return place("vibrators", "eggs-kegel-balls");

    case "vibrator": {
      if (has(n, ...PROSTATE)) return place("anal-toys", "prostate-massagers");
      if (anal) return place("anal-toys", "anal-dildos-vibrators");
      if (couple) return place("couples", "couples-vibrators");
      return place(
        "vibrators",
        pick(n, [
          ["remote-app", ["приложение", "\\bapp\\b", "дистанционно", "\\bremote\\b", "lovense", "bluetooth", "\\blush\\b", "magic motion", "камера", "\\bsmart\\b"]],
          ["eggs-kegel-balls", ["яйце", "\\begg\\b", "топчета", "кегел", "kegel"]],
          ["air-pulse", ["въздуш\\p{L}*", "air ?pulse", "air ?wave", "\\bair\\b(?! ?pump)", "сукцион\\p{L}*", "сонарен", "\\bpro [123]\\b", "womanizer", "penguin"]],
          ["rabbit-vibrators", ["заек", "зайче", "rabbit", "bunny", "вибратор с (?:клиторстимулатор|клиторен стимулатор)", "двойна стимулация", "тройна стимулация", "dual action", "triple"]],
          ["thrusting-vibrators", ["тласкащ\\p{L}*", "пулсиращ\\p{L}*", "потупващ\\p{L}*", "пулсатор", "thrust\\p{L}*", "pulsat\\p{L}*", "tapping"]],
          ["finger-vibrators", ["пръст", "finger", "напръстник"]],
          ["g-spot-vibrators", ["g-?точка", "g ?точка", "g-?spot", "g-spotter", "г-?точка"]],
          ["clitoral-vibrators", ["клиторстимулатор", "клитор стимулатор", "клиторен стимулатор", "стимулатор(?:-вибратор)? за (?:клитор|вулва)", "lay-on", "curvy", "dual kiss", "ротиращ стимулатор", "стимулатор-вибратор", "clitstimulator", "вибростимулатор", "climaxer", "^стимулатор"]],
          ["wand-massagers", ["масажор", "massager", "\\bwand\\b"]],
          ["realistic-vibrators", ["тестис\\p{L}*", "реалист\\p{L}*", "realistic", "пенис", "\\bcock\\b", "cyberskin", "кибер кожа", "dr\\.? skin"]],
          ["bullet-vibrators", ["мини", "\\bmini\\b", "куршум", "bullet", "булет", "червило", "lipstick", "бикини", "гащички", "\\bpanty\\b"]],
        ], "classic-vibrators"),
      );
    }

    case "dildo": {
      if (has(n, "колан", "strap", "страп\\p{L}*", "харнес", "harness")) return place("couples", "strap-on-dildos");
      if (anal) return place("anal-toys", "anal-dildos-vibrators");
      const cm = Number((/(\d{1,2}(?:[.,]\d)?)\s?(?:см|cm)\b/iu.exec(n)?.[1] ?? "0").replace(",", "."));
      if (has(n, "стъкл\\p{L}*", "\\bglass\\b", "метал\\p{L}*", "\\bmetal\\b", "стомана", "\\bsteel\\b", "алумини\\p{L}*", "\\bcrystal\\b")) return place("dildos", "glass-metal-dildos");
      if (has(n, "двойно дилдо", "двоен", "двустран\\p{L}*", "double(?! density)", "двойно проникване") && !has(n, "двойна плътност", "dual density")) return place("dildos", "double-dildos");
      if (has(n, "вибриращ\\p{L}*", "с вибрация", "vibrat\\p{L}*", "потупкващ\\p{L}*")) return place("dildos", "vibrating-dildos");
      if (cm >= 24 || has(n, "\\bxxl\\b", "голям\\p{L}*", "massive", "\\bhuge\\b", "monster", "огромн\\p{L}*", "фистинг", "fisting")) return place("dildos", "xxl-dildos");
      if (has(n, "реалист\\p{L}*", "тестис\\p{L}*", "realistic", "\\breal", "\\bcock\\b", "отливка", "mr\\.? dixx", "dr\\.? skin", "get real", "необрязан\\p{L}*", "плътност", "термо")) return place("dildos", "realistic-dildos");
      if (has(n, "вакуум\\p{L}*", "vacuum", "suction", "вендуза")) return place("dildos", "suction-cup-dildos");
      if (has(n, "динозав\\p{L}*", "дракон", "дявол", "крила", "pegasus", "alien", "извънземн\\p{L}*", "чудовищ\\p{L}*", "фантаз\\p{L}*", "fantasy", "пипал\\p{L}*", "tentacle", "еднорог", "unicorn", "\\bкон\\b", "horse", "русалк\\p{L}*", "demon", "създание", "creature", "брокат", "glitter", "dildolls?", "спасител")) return place("dildos", "fantasy-dildos");
      return place("dildos", "classic-dildos");
    }

    case "plug":
      return place(
        "anal-toys",
        pick(n, [
          ["prostate-massagers", PROSTATE],
          ["anal-beads", ["броеница", "\\bbeads\\b", "топчета", "верига"]],
          ["anal-douches", ["\\bдуш\\b", "\\bdouche\\b", "клизма", "enema"]],
          ["anal-kits", ["комплект", "дилатор\\p{L}*", "\\bset\\b", "\\bkit\\b", "тренировъчен", "trainer", "training"]],
          ["vibrating-plugs", ["вибр\\p{L}*", "\\bvibe\\b", "vibrat\\p{L}*", "дистанционно", "\\bremote\\b", "приложение", "\\bapp\\b", "ротиращ\\p{L}*", "rotat\\p{L}*"]],
          ["jeweled-tail-plugs", ["камък", "кристал\\p{L}*", "диамант\\p{L}*", "бижу", "jewel\\p{L}*", "\\bgem\\p{L}*", "сърце", "опашка", "\\btail\\b", "rosebud", "розичка", "перла", "bijou", "стрази"]],
        ], "butt-plugs"),
      );

    case "prostate":
      return place("anal-toys", "prostate-massagers");

    case "masturbator": {
      const sub = pick(n, [
          ["automatic-masturbators", ["автоматич\\p{L}*", "хендс?фри", "hands-?free", "\\bmachine\\b", "машина", "autoblow", "thrust\\p{L}*", "milker", "тласкащ\\p{L}*", "въртящ\\p{L}*"]],
          ["vibrating-masturbators", ["вибр\\p{L}*", "\\bvibe\\b", "vibrat\\p{L}*", "вибро", "приложение", "\\bapp\\b"]],
          ["pocket-pussies", ["вагин\\p{L}*", "\\bpussy\\b", "отливка", "vagina", "торс", "torso"]],
          ["butt-masturbators", ["анус", "\\bass\\b", "\\bbutt\\b", "дупе", "\\banal\\b"]],
          ["masturbator-eggs", ["яйце", "\\begg\\b"]],
          ["discreet-strokers", ["\\btenga\\b", "джобен", "pocket", "\\bcup\\b", "spinner", "air-?tech", "\\bflip\\b", "дискрет\\p{L}*", "discreet", "crystal mist", "\\baero\\b", "\\bpuffy\\b", "\\bbobble\\b", "\\bgeo\\b"]],
        ], "classic-strokers");
      // Tenga's cups are discreet strokers even when the name does not say "Tenga".
      return place("masturbators", sub === "classic-strokers" && brand === "Tenga" ? "discreet-strokers" : sub);
    }

    case "doll":
      return place("masturbators", "sex-dolls");

    case "ring":
      if (couple && has(n, ...VIBRATING)) return place("couples", "couples-vibrators");
      return place("penis-enhancement", has(n, ...VIBRATING) ? "vibrating-cock-rings" : "cock-rings");

    case "pump":
      if (has(n, "зърна", "гърди", "клитор\\p{L}*", "вагин\\p{L}*", "дамск\\p{L}*", "\\bpussy\\b", "nipple", "breast", "помпичк\\p{L}*")) return place("bdsm", "nipple-play");
      if (has(n, "маншон\\p{L}*", "ръкав\\p{L}*", "sleeve", "удължител\\p{L}*", "екстендер", "extender", "удебелител\\p{L}*", "maleedge", "еректор", "уголемител")) return place("penis-enhancement", "sleeves-extenders");
      return place("penis-enhancement", "penis-pumps");

    case "strap":
      if (has(n, "дилдо", "dildo", "strapless", "страплес", "безремъч\\p{L}*") && !has(n, "бикини", "харнес", "harness", "гащи\\p{L}*", "briefs", "колан с ")) {
        return place("couples", "strap-on-dildos");
      }
      return place("couples", "strap-ons");

    case "machine":
      if (has(n, "мастурб\\p{L}*", "autoblow")) return place("masturbators", "automatic-masturbators");
      return place("couples", "machines-furniture");

    case "game":
      return place("couples", has(n, "\\bигра\\b", "\\bигри\\b", "зар\\p{L}*", "\\bкарти\\b", "\\bgame\\b", "\\bdice\\b", "колело на", "въртележка", "дартс", "домино", "пози") ? "sex-games" : "party-gifts");

    case "kit":
      if (brand === "Ouch!" || has(n, "bdsm", "фетиш", "връзване")) return place("bdsm", "bondage-kits");
      if (anal) return place("anal-toys", "anal-kits");
      return place("couples", "gift-sets");

    case "chastity":
      return place("bdsm", "chastity");
    case "cuffs":
      return place("bdsm", has(n, "комплект", "\\bkit\\b", "\\bset\\b") && !has(n, "белезници за ръце и крака") ? "bondage-kits" : "restraints");
    case "mask":
      return place("bdsm", "masks-blindfolds");
    case "whip":
      return place("bdsm", "whips-paddles");
    case "gag":
      return place("bdsm", "gags");
    case "clamp":
      return place("bdsm", "nipple-play");
    case "sensation":
      return place("bdsm", "sensation-play");
    case "electro":
      return place("bdsm", "electro-stimulation");
    case "collar":
      return place("bdsm", "collars-leashes");
    case "bdsm":
      if (has(n, "домино", "\\bигра\\b", "\\bgame\\b")) return place("couples", "sex-games");
      return place("bdsm", "bondage-kits");

    case "lingerie":
      // "Panties – strap-on harness with bullet" is a harness first, underwear second.
      if (has(n, "пенис колан", "страп-?он", "strap-?on", "харнес", "harness")) return place("couples", "strap-ons");
      return place(
        "lingerie",
        pick(n, [
          ["mens-lingerie", ["мъжк\\p{L}*", "за мъже", "\\bmen\\b", "\\bjock\\b", "\\bbriefs?\\b"]],
          ["costumes", ["костюм\\p{L}*", "costume", "униформа", "ролев\\p{L}*", "медицинска сестра", "прислужница", "полицай\\p{L}*", "ученичка", "секси коте", "стюардеса", "дяволица", "\\bкоте\\b", "монахиня", "нимфа"]],
          ["fetish-latex", ["латекс\\p{L}*", "latex", "винил\\p{L}*", "vinyl", "wet ?look", "мокър ефект", "\\bpvc\\b", "лачен\\p{L}*", "кож(?:ен|ена|ено|ени)\\b", "leather"]],
          ["bodystockings", ["целокупно", "бодистокинг", "bodystocking", "catsuit", "кетсюит", "мрежа за тяло", "гащеризон", "комбинезон"]],
          ["bodysuits", ["\\bбоди\\b", "\\bbody\\b", "\\bteddy\\b"]],
          ["lingerie-sets", ["комплект", "\\bсет\\b", "\\bset\\b", "сутиен и", "бюстие и", "топ и", " и (?:бикини|прашк\\p{L}*|шорти|жартиерн\\p{L}*)"]],
          ["dresses-chemises", ["рокля", "туника", "\\bdress\\b", "бейбидол", "babydoll", "нощничка", "нощница", "chemise", "пеньоар", "халат", "кимоно", "\\bпола\\b"]],
          ["corsets-bustiers", ["корсет\\p{L}*", "корсаж", "бюстие", "\\bcorset\\b", "bustier"]],
          ["bras", ["сутиен\\p{L}*", "\\bbra\\b", "\\bтоп\\b", "\\btop\\b", "бралет", "блуза"]],
          ["panties-thongs", ["прашк\\p{L}*", "бикини", "\\bthong\\b", "танга", "\\bслип\\p{L}*", "боксерки", "\\bшорти\\b"]],
          ["stockings", ["чорап\\p{L}*", "stocking", "\\bгети\\b", "\\bклин\\b", "tights"]],
          ["garter-belts", ["жартиер\\p{L}*", "\\bgarter\\b"]],
        ], "accessories"),
      );
  }
}

// ── Audiences ("За нея / За него") ──

export function audiencesFor(name: string, p: Placement): AudienceId[] {
  const n = name.toLowerCase();
  const out = new Set<AudienceId>();
  const forHim = has(n, "мъж\\p{L}*", "\\bmen\\b", "\\bman\\b", "for him", "ерекци\\p{L}*", "пенис\\p{L}*", "задържа\\p{L}*", "\\bdelay\\b", "xtend", "уголем\\p{L}*", "потентн\\p{L}*", "тестостерон", "сперм\\p{L}*");
  const forHer = has(n, "жен\\p{L}*", "\\bwoman\\b", "\\bwomen\\b", "за нея", "клитор\\p{L}*", "вагин\\p{L}*", "лабия", "гърди", "for her", "female", "дамск\\p{L}*", "вулва", "менструал\\p{L}*", "тампон\\p{L}*");
  switch (p.category) {
    case "vibrators":
      out.add(forHim ? "him" : "her");
      break;
    case "dildos":
      out.add("her");
      break;
    case "anal-toys":
      if (p.sub === "prostate-massagers") out.add("him");
      break;
    case "masturbators":
    case "penis-enhancement":
      out.add("him");
      break;
    case "bdsm":
      if (p.sub === "chastity") out.add("him");
      if (p.sub === "nipple-play" && forHer) out.add("her");
      break;
    case "lingerie":
      out.add(p.sub === "mens-lingerie" ? "him" : "her");
      break;
    case "lube":
    case "sexual-wellness":
      if (forHim) out.add("him");
      if (forHer) out.add("her");
      break;
    case "condoms":
      out.add("him");
      break;
  }
  return [...out];
}

// ── Facts read from the name (never invented) ──
// Stored as language-neutral codes, so the shop can show them in Bulgarian and English.


const COLOURS: [RegExp, string][] = [
  [rx("\\bчер(?:ен|на|но|ни)\\b|\\bblack\\b"), "black"],
  [rx("\\bрозов\\p{L}*|\\bpink\\b|\\brose\\b"), "pink"],
  [rx("\\bчервен\\p{L}*|\\bred\\b|бордо|burgundy"), "red"],
  [rx("\\bлилав\\p{L}*|\\bpurple\\b|виолетов\\p{L}*"), "purple"],
  [rx("\\bбял\\b|\\bбяла\\b|\\bбяло\\b|\\bбели\\b|\\bwhite\\b"), "white"],
  [rx("\\bсин\\b|\\bсиня\\b|\\bсиньо\\b|\\bсини\\b|\\bblue\\b"), "blue"],
  [rx("\\bзелен\\p{L}*|\\bgreen\\b"), "green"],
  [rx("\\bзлат\\p{L}*|\\bgold\\b"), "gold"],
  [rx("\\bсребр\\p{L}*|\\bsilver\\b"), "silver"],
  [rx("\\bтелесен\\b|\\bnude\\b|\\bкарамел\\b"), "nude"],
];

const COLOUR_COLUMN = new Set([
  "black", "pink", "red", "purple", "white", "blue", "green", "gold", "silver", "aqua", "yellow", "orange", "grey", "peach", "brown",
  "multicolor", "transparent",
]);

const num = (s: string) => s.replace(",", ".");

export function featuresFor(name: string, colourColumn: string, category: string): Feature[] {
  const n = name.toLowerCase();
  const out: Feature[] = [];
  const cm = /(\d{1,2}(?:[.,]\d)?)\s?(?:см|cm)\b/iu.exec(n);
  if (cm) out.push(["size", num(cm[1])]);
  const ml = /(\d{1,4})\s?(?:мл|ml)\b/iu.exec(n);
  if (ml) out.push(["volume", ml[1]]);
  const grams = /(\d{1,4})\s?(?:гр|г|g)\b\.?/iu.exec(n);
  if (!ml && grams && (category === "lube" || category === "sexual-wellness")) out.push(["weight", grams[1]]);
  if (category === "condoms") {
    const count = /[xх]\s?(\d{1,3})\b|(\d{1,3})\s?(?:бр|броя|'s)\b|\b(\d{1,3})['’]/iu.exec(n);
    if (count) out.push(["count", count[1] ?? count[2] ?? count[3]]);
  }
  if (category === "lingerie") {
    const size = /(?:^|[\s,(])(XS|S|M|L|XL|XXL|S\/M|M\/L|L\/XL|SM|ML|OS|one size)(?=$|[\s,)])/u.exec(name);
    if (size) out.push(["clothing", size[1]]);
  }
  const colourColumn2 = colourColumn.trim().toLowerCase();
  const colour = COLOUR_COLUMN.has(colourColumn2) ? colourColumn2 : COLOURS.find(([re]) => re.test(n))?.[1];
  if (colour) out.push(["colour", colour]);
  const flag = (key: FeatureKey, ...words: string[]) => {
    if (has(n, ...words)) out.push([key]);
  };
  flag("rechargeable", "презаред\\p{L}*", "rechargeable", "\\busb\\b");
  flag("waterproof", "водоустойчив\\p{L}*", "waterproof");
  if (has(n, "приложение", "\\bapp\\b", "bluetooth")) out.push(["app"]);
  else flag("remote", "дистанционно", "\\bremote\\b");
  flag("warming", "загрява\\p{L}*", "затопл\\p{L}*", "подгряван\\p{L}*", "\\bheat\\b", "warming");
  flag("cooling", "охлажд\\p{L}*", "cooling");
  flag("suction", "вакуум\\p{L}*", "vacuum", "suction");
  flag("waterBased", "водна основа", "\\baqua\\b", "water-?based", "\\bh2o\\b");
  if (category === "lube" || category === "sexual-wellness") flag("siliconeBased", "силиконов\\p{L}*", "silicone");
  else flag("silicone", "силикон\\p{L}*", "silicone");
  flag("glass", "стъкл\\p{L}*", "\\bglass\\b");
  flag("metal", "метал\\p{L}*", "\\bmetal\\b", "стомана");
  flag("leather", "кож(?:ен|ени|ена)\\b", "leather");
  flag("lace", "дантел\\p{L}*", "\\blace\\b");
  flag("vegan", "веган\\p{L}*", "vegan");
  flag("vibration", "с вибрация", "вибриращ\\p{L}*");
  return out;
}

// ── English names ──
// Real translations live in data/translations/product-names-en.json. This glossary only covers products that were
// added after the last translation run, so English pages never show a raw Bulgarian name.

const GLOSSARY: [string, string][] = [
  ["анален разширител", "butt plug"], ["анални разширители", "butt plugs"], ["анална броеница", "anal beads"], ["анални топчета", "anal beads"],
  ["анален вибратор", "anal vibrator"], ["анално дилдо", "anal dildo"], ["анален душ", "anal douche"], ["анален лубрикант", "anal lubricant"],
  ["простатен стимулатор", "prostate massager"], ["простатен масажор", "prostate massager"], ["вибратор заек", "rabbit vibrator"],
  ["вибратор за g-точка", "G-spot vibrator"], ["клиторстимулатор", "clitoral stimulator"], ["клиторен стимулатор", "clitoral stimulator"],
  ["въздушен стимулатор", "air pulse stimulator"], ["виброкуршум", "bullet vibrator"], ["виброяйце", "vibrating egg"], ["вибро яйце", "vibrating egg"],
  ["вагинални топчета", "kegel balls"], ["вибратор за пръст", "finger vibrator"], ["пенис ринг", "cock ring"], ["вибро ринг", "vibrating cock ring"],
  ["виброринг", "vibrating cock ring"], ["пенис помпа", "penis pump"], ["пенис колан", "strap-on harness"], ["пенис маншон", "penis sleeve"],
  ["пенис удължител", "penis extender"], ["секс кукла", "sex doll"], ["секс машина", "sex machine"], ["секс игра", "sex game"],
  ["мастурбатор", "masturbator"], ["вагина", "pussy"], ["вибратор", "vibrator"], ["масажор", "massager"], ["дилдо", "dildo"], ["дилда", "dildos"],
  ["белезници", "handcuffs"], ["маска за очи", "blindfold"], ["маска", "mask"], ["камшик", "whip"], ["нагайка", "riding crop"], ["палка", "paddle"],
  ["наустник", "gag"], ["щипки за зърна", "nipple clamps"], ["нашийник", "collar"], ["повод", "leash"], ["клетка за пенис", "chastity cage"],
  ["въже", "rope"], ["лубрикант", "lubricant"], ["на водна основа", "water-based"], ["силиконов", "silicone-based"], ["масажно олио", "massage oil"],
  ["масажна свещ", "massage candle"], ["масажно масло", "massage oil"], ["възбуждащ гел", "arousal gel"], ["възбуждащи капки", "arousal drops"],
  ["задържащ спрей", "delay spray"], ["феромонен парфюм", "pheromone perfume"], ["феромони", "pheromones"], ["испанска муха", "Spanish fly"],
  ["почистващ спрей", "cleaning spray"], ["презервативи", "condoms"], ["презерватив", "condom"], ["целокупно боди", "bodystocking"], ["боди", "bodysuit"],
  ["прашки", "thong"], ["прашка", "thong"], ["бикини", "panties"], ["сутиен", "bra"], ["бюстие", "bustier"], ["корсет", "corset"], ["жартиери", "garters"],
  ["жартиер", "garter belt"], ["чорапогащник", "pantyhose"], ["чорапи", "stockings"], ["бейбидол", "babydoll"], ["нощничка", "chemise"], ["рокля", "dress"],
  ["костюм", "costume"], ["ръкавици", "gloves"], ["мигли", "eyelashes"], ["таблетки", "tablets"], ["капсули", "capsules"], ["капки", "drops"],
  ["спрей", "spray"], ["крем", "cream"], ["гел", "gel"], ["серум", "serum"], ["комплект", "set"], ["с вибрация", "with vibration"],
  ["вибриращ", "vibrating"], ["вибриращо", "vibrating"], ["вибриращи", "vibrating"], ["с дистанционно", "with remote control"],
  ["с приложение", "with app"], ["презареждащ", "rechargeable"], ["презаредим", "rechargeable"], ["водоустойчив", "waterproof"],
  ["реалистично", "realistic"], ["реалистичен", "realistic"], ["с тестиси", "with balls"], ["с вакуумна основа", "with suction cup"],
  ["с вакуум", "with suction cup"], ["силикон", "silicone"], ["стъкло", "glass"], ["дантела", "lace"], ["дантелен", "lace"], ["мрежа", "mesh"],
  ["с отворено дъно", "crotchless"], ["разкриващ", "open"], ["малък", "small"], ["среден", "medium"], ["голям", "large"],
  ["черен", "black"], ["черна", "black"], ["черно", "black"], ["черни", "black"], ["розов", "pink"], ["розова", "pink"], ["розово", "pink"],
  ["червен", "red"], ["червена", "red"], ["червени", "red"], ["лилав", "purple"], ["лилава", "purple"], ["бял", "white"], ["бяла", "white"],
  ["бели", "white"], ["син", "blue"], ["синя", "blue"], ["телесен", "nude"], ["златен", "gold"], ["златист", "gold"], ["сребрист", "silver"],
  ["прозрачен", "clear"], ["мл", "ml"], ["см", "cm"], ["гр", "g"], ["бр.", "pcs"], ["бр", "pcs"], ["с ", "with "], ["за ", "for "], [" и ", " and "],
];
const GLOSSARY_RE = GLOSSARY.sort((a, b) => b[0].length - a[0].length).map(
  ([bg, en]) => [rx(`(?<![\\p{L}])${bg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").trim()}(?![\\p{L}])`), en.trim()] as const,
);

export function fallbackEnglishName(bg: string): string {
  let out = bg;
  for (const [re, en] of GLOSSARY_RE) out = out.replace(new RegExp(re.source, "giu"), en);
  // Anything still in Cyrillic is transliterated rather than shown as Bulgarian.
  out = out.replace(/\p{Script=Cyrillic}+/gu, (w) => translit(w));
  out = out.replace(/\s{2,}/g, " ").trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// ── Estimated prices (the export has no prices) ──
// Ranges are typical Bulgarian retail prices in euro for each kind of product. Brand and features move the price
// inside or slightly above the range. Every estimate is replaced as soon as data/prices.csv has a price for the SKU.

const RANGES: Record<string, [number, number]> = {
  "vibrators/air-pulse": [29, 64], "vibrators/rabbit-vibrators": [36, 72], "vibrators/g-spot-vibrators": [26, 54],
  "vibrators/clitoral-vibrators": [24, 52], "vibrators/bullet-vibrators": [14, 32], "vibrators/finger-vibrators": [14, 29],
  "vibrators/wand-massagers": [34, 79], "vibrators/remote-app": [49, 119], "vibrators/realistic-vibrators": [24, 52],
  "vibrators/thrusting-vibrators": [44, 89], "vibrators/eggs-kegel-balls": [14, 42], "vibrators/classic-vibrators": [22, 49],
  "dildos/realistic-dildos": [24, 59], "dildos/suction-cup-dildos": [19, 44], "dildos/double-dildos": [24, 54],
  "dildos/glass-metal-dildos": [29, 64], "dildos/xxl-dildos": [39, 79], "dildos/vibrating-dildos": [29, 59],
  "dildos/fantasy-dildos": [29, 59], "dildos/classic-dildos": [19, 42],
  "anal-toys/butt-plugs": [12, 34], "anal-toys/jeweled-tail-plugs": [14, 32], "anal-toys/vibrating-plugs": [29, 69],
  "anal-toys/anal-beads": [12, 29], "anal-toys/prostate-massagers": [34, 89], "anal-toys/anal-dildos-vibrators": [24, 59],
  "anal-toys/anal-kits": [24, 49], "anal-toys/anal-douches": [14, 39],
  "masturbators/pocket-pussies": [24, 79], "masturbators/butt-masturbators": [29, 89], "masturbators/vibrating-masturbators": [39, 89],
  "masturbators/automatic-masturbators": [69, 189], "masturbators/masturbator-eggs": [9, 14], "masturbators/discreet-strokers": [14, 39],
  "masturbators/sex-dolls": [59, 199], "masturbators/classic-strokers": [19, 49],
  "penis-enhancement/penis-pumps": [24, 74], "penis-enhancement/sleeves-extenders": [19, 49], "penis-enhancement/cock-rings": [9, 26],
  "penis-enhancement/vibrating-cock-rings": [16, 39], "penis-enhancement/creams-pills": [14, 39],
  "couples/couples-vibrators": [39, 99], "couples/strap-ons": [34, 79], "couples/strap-on-dildos": [29, 69], "couples/sex-games": [9, 26],
  "couples/party-gifts": [6, 19], "couples/gift-sets": [24, 59], "couples/machines-furniture": [49, 189],
  "bdsm/restraints": [12, 39], "bdsm/masks-blindfolds": [9, 29], "bdsm/whips-paddles": [14, 39], "bdsm/gags": [14, 29],
  "bdsm/nipple-play": [9, 32], "bdsm/sensation-play": [9, 26], "bdsm/electro-stimulation": [29, 79], "bdsm/collars-leashes": [16, 39],
  "bdsm/chastity": [19, 49], "bdsm/bondage-kits": [29, 79],
  "lingerie/bodysuits": [24, 49], "lingerie/bodystockings": [16, 34], "lingerie/lingerie-sets": [26, 49], "lingerie/dresses-chemises": [24, 49],
  "lingerie/bras": [22, 44], "lingerie/corsets-bustiers": [29, 59], "lingerie/panties-thongs": [12, 22], "lingerie/stockings": [9, 22],
  "lingerie/garter-belts": [12, 24], "lingerie/costumes": [34, 69], "lingerie/fetish-latex": [24, 59], "lingerie/mens-lingerie": [14, 29],
  "lingerie/accessories": [8, 22],
  "lube/water-based": [8, 22], "lube/silicone-based": [12, 26], "lube/flavored": [8, 18], "lube/warming-cooling": [9, 19],
  "lube/anal-lube": [10, 26], "lube/personal-lubricants": [8, 24],
  "sexual-wellness/arousal": [10, 26], "sexual-wellness/delay": [12, 26], "sexual-wellness/spanish-fly": [14, 29],
  "sexual-wellness/massage": [12, 26], "sexual-wellness/pheromones": [16, 39], "sexual-wellness/supplements": [14, 39],
  "sexual-wellness/toy-care": [7, 18], "sexual-wellness/intimate-care": [7, 18],
};

const PREMIUM: Record<string, number> = {
  "LELO": 1.9, "Womanizer": 1.7, "We-Vibe": 1.7, "Lovense": 1.6, "Fun Factory": 1.5, "b-Vibe": 1.5, "Jimmyjane": 1.5,
  "Svakom": 1.35, "Dorcel": 1.2, "Doc Johnson": 1.1, "Pjur": 1.15, "System JO": 1.1, "Satisfyer": 1.0, "Tenga": 1.0,
  "Shots": 0.9, "Dream Toys": 0.9, "ToyJoy": 0.9, "Loveline": 0.9, "Cottelli Collection": 0.9, "Sexwell": 0.9,
};

/** Stable 0..1 number from a string, so the estimate does not change between imports. */
function unit(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}

/** Prices end in ,90 (or ,99 under 10 €). */
function psychological(p: number): number {
  if (p < 10) return Math.max(2.99, Math.floor(p) + 0.99);
  return Math.max(9.9, Math.round(p) - 0.1);
}

export function estimatePrice(sku: string, name: string, brand: string, p: Placement): number {
  const n = name.toLowerCase();
  if (p.category === "condoms") {
    const m = /[xх]\s?(\d{1,3})\b|(\d{1,3})\s?(?:бр|броя|'s)\b|\b(\d{1,3})['’]/iu.exec(n);
    const fallback = /^презерватив\b/iu.test(name) ? 1 : 3;
    const count = Number(m?.[1] ?? m?.[2] ?? m?.[3] ?? fallback) || fallback;
    const each = count >= 40 ? 0.62 : count >= 10 ? 1.15 : count >= 3 ? 1.65 : 1.9;
    const premium = has(n, "0[.,]0\\d", "my ?size", "сегами", "sagami") ? 1.6 : 1;
    return psychological(Math.max(1.9, count * each * premium + 0.6));
  }
  if (p.category === "lube") {
    const ml = Number(/(\d{1,4})\s?(?:мл|ml)\b/iu.exec(n)?.[1] ?? 0);
    if (ml) {
      const base = ml <= 30 ? 8.9 : ml <= 50 ? 11 : ml <= 100 ? 16 : ml <= 150 ? 19 : ml <= 250 ? 23 : 34;
      return psychological(base * (PREMIUM[brand] ?? 1));
    }
  }
  if (brand === "Tenga" && p.category === "masturbators") {
    return has(n, "\\baero\\b") ? 99.9 : has(n, "\\bflip\\b") ? 79.9 : has(n, "air-?tech", "air tech") ? 39.9
      : has(n, "spinner") ? 32.9 : has(n, "яйце", "\\begg\\b") ? 11.9 : has(n, "джобен", "pocket") ? 14.9
      : has(n, "premium", "original", "dual", "soft case", "rolling", "air ?flow", "\\bcup\\b") ? 22.9 : 24.9;
  }
  const [min, max] = RANGES[`${p.category}/${p.sub}`] ?? [14, 39];
  let price = min + (max - min) * (0.25 + 0.5 * unit(sku));
  price *= PREMIUM[brand] ?? 1;
  if (has(n, "презаред\\p{L}*", "rechargeable", "\\busb\\b")) price *= 1.12;
  if (has(n, "приложение", "\\bapp\\b", "bluetooth")) price *= 1.15;
  if (has(n, "комплект", "\\bset\\b", "\\bkit\\b")) price *= 1.12;
  if (has(n, "premium", "luxury", "луксоз\\p{L}*", "deluxe", "делукс", "\\belite\\b")) price *= 1.15;
  if (has(n, "\\bmini\\b", "мини")) price *= 0.82;
  const cm = Number((/(\d{1,2}(?:[.,]\d)?)\s?(?:см|cm)\b/iu.exec(n)?.[1] ?? "0").replace(",", "."));
  if (cm >= 24) price *= 1.15;
  return psychological(price);
}

// ── URLs ──

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya",
  ё: "yo", ы: "y", э: "e",
};

export function translit(str: string): string {
  return [...str].map((ch) => {
    const lower = ch.toLowerCase();
    const t = TRANSLIT[lower];
    if (t === undefined) return ch;
    return ch !== lower ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  }).join("");
}

export function slugify(str: string): string {
  return translit(str.toLowerCase())
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}
