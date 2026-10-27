import "server-only";
import { bundleSaving } from "./bundle-math";
import { allProducts, getBySku } from "./catalog";
import { BUNDLE_DISCOUNT } from "./site";
import type { FeatureKey, Product } from "./types";

// "Buy together" sets on product pages: the product plus one or two extras that are safe to use with it.
// Compatibility rules that matter:
// - toys and condoms only get water-based lube (silicone-based lube damages silicone toys, oils break condoms),
// - no warming, cooling or tingling lube in a set, nobody gets surprised by it,
// - massage oil only goes with lingerie and BDSM aftercare, never with condoms.

export type BundleRole =
  | "lube" | "strokerLube" | "condomLube" | "analLube" | "cleaner" | "powder" | "condoms" | "cockRing" | "blindfold" | "sensation" | "cuffs"
  | "warmUp" | "aftercare";

export type Bundle = {
  /** The product first, then its extras. */
  skus: string[];
  /** Role of each extra, for the "why these go together" line. */
  roles: BundleRole[];
  discount: number;
  price: number;
  saving: number;
};

const has = (p: Product, key: FeatureKey) => p.features.some(([k]) => k === key);
const named = (p: Product, re: RegExp) => re.test(p.name.bg);
const plainWaterLube = (p: Product) =>
  p.category === "lube" && has(p, "waterBased") && !has(p, "siliconeBased") && !has(p, "warming") && !has(p, "cooling") && !has(p, "vibration");
// Flavoured lubes are made for oral sex: fine next to condoms, odd next to a toy.
const flavoured = (p: Product) => p.sub === "flavored" || named(p, /cocktail|аромат|ягода|cherry|straw|пина|колада|мохито|дъвка|цитрус/i);

/** Which products can be each extra, whatever their stock. */
const FITS: Record<BundleRole, (p: Product) => boolean> = {
  lube: (p) => plainWaterLube(p) && p.sub !== "anal-lube" && !flavoured(p) && !named(p, /орален|масаж/i),
  strokerLube: (p) => plainWaterLube(p) && p.sub !== "anal-lube" && !flavoured(p) && !named(p, /орален|масаж/i),
  condomLube: (p) => plainWaterLube(p) && p.sub !== "anal-lube" && !named(p, /масаж/i),
  analLube: (p) => plainWaterLube(p) && p.sub === "anal-lube" && !named(p, /фистинг|аналингус/i),
  cleaner: (p) => p.sub === "toy-care" && named(p, /почистван/i) && !named(p, /латекс/i),
  powder: (p) => p.sub === "toy-care" && named(p, /пудра/i),
  condoms: (p) => p.category === "condoms" && /durex/i.test(`${p.brand} ${p.name.bg}`),
  cockRing: (p) => p.sub === "cock-rings" && p.price <= 30 && !named(p, /дилдо|двойки|клитор/i),
  blindfold: (p) => p.sub === "masks-blindfolds" && named(p, /маск[аи] за очи/i),
  sensation: (p) => p.sub === "sensation-play",
  cuffs: (p) => p.sub === "restraints" && named(p, /белезници/i) && !named(p, /крака|каиш|легло|hogtie|бедра|повод|глезени/i),
  warmUp: (p) => p.sub === "massage",
  aftercare: (p) => p.sub === "massage" && named(p, /олио|масло/i),
};

/** The two extras that suit a product, or null when it has no set (supplements, games, arousal gels…). */
function rolesFor(p: Product): [BundleRole, BundleRole] | null {
  const { category: c, sub: s } = p;
  if (c === "anal-toys") return s === "anal-douches" ? ["analLube", "condoms"] : ["analLube", "cleaner"];
  if (c === "masturbators") return ["strokerLube", ["pocket-pussies", "butt-masturbators", "sex-dolls"].includes(s) ? "powder" : "cleaner"];
  if (c === "vibrators" || c === "dildos") return ["lube", "cleaner"];
  if (c === "couples") {
    if (s === "couples-vibrators" || s === "strap-ons" || (s === "machines-furniture" && named(p, /машин/i))) return ["lube", "cleaner"];
    return s === "machines-furniture" ? ["warmUp", "blindfold"] : null;
  }
  if (c === "penis-enhancement") {
    if (s === "penis-pumps") return ["lube", "cockRing"];
    if (s === "sleeves-extenders") return ["lube", "cleaner"];
    return ["condoms", "condomLube"];
  }
  if (c === "condoms") return ["condomLube", "cockRing"];
  // Only plain water- or silicone-based lube is sure to be safe with condoms (tingling and warming ones not always).
  const condomSafe = plainWaterLube(p) || (has(p, "siliconeBased") && !has(p, "waterBased") && !has(p, "warming") && !has(p, "cooling"));
  if (c === "lube") return condomSafe ? ["condoms", "cleaner"] : null;
  if (c === "bdsm") {
    if (s === "restraints") return ["blindfold", "sensation"];
    if (s === "masks-blindfolds") return ["cuffs", "sensation"];
    if (s === "whips-paddles") return ["cuffs", "aftercare"];
    if (s === "gags" || s === "collars-leashes") return ["cuffs", "blindfold"];
    if (s === "nipple-play" || s === "sensation-play") return ["blindfold", "cuffs"];
    return null;
  }
  if (c === "lingerie") return ["warmUp", "blindfold"];
  if (s === "massage") return ["blindfold", "sensation"];
  return null;
}

// In-stock products per role, best first (the catalog is already in "recommended" order).
let pools: Map<BundleRole, Product[]> | undefined;
function pool(role: BundleRole): Product[] {
  pools ??= new Map((Object.keys(FITS) as BundleRole[]).map((r) => [r, allProducts().filter((p) => p.stock > 0 && FITS[r](p))]));
  return pools.get(role)!;
}

/** Same product → same extras on every visit, but not the same lube on every page. */
function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function pick(main: Product, role: BundleRole, taken: Set<string>): Product | undefined {
  // An extra should not cost more than the product itself (unless both are small purchases).
  const fits = pool(role).filter((p) => !taken.has(p.sku) && p.price <= Math.max(30, main.price));
  if (!fits.length) return undefined;
  // Same brand first: Tenga lotion with a Tenga, pjur with pjur.
  const sameBrand = main.brandSlug ? fits.filter((p) => p.brandSlug === main.brandSlug) : [];
  const choice = (sameBrand.length ? sameBrand : fits).slice(0, 4);
  return choice[hash(main.sku) % choice.length];
}

const cache = new Map<string, Bundle[]>();

/** "Двойка" (product + 1 extra) and "Тройка" (product + 2 extras), only while everything is in stock. */
export function bundlesFor(p: Product): Bundle[] {
  const cached = cache.get(p.sku);
  if (cached) return cached;
  const roles = p.stock > 0 ? rolesFor(p) : null;
  const out: Bundle[] = [];
  const first = roles && pick(p, roles[0], new Set([p.sku]));
  if (roles && first) {
    const second = pick(p, roles[1], new Set([p.sku, first.sku]));
    const sets = [[first], ...(second ? [[first, second]] : [])];
    for (const extras of sets) {
      const items = [p, ...extras];
      const discount = BUNDLE_DISCOUNT[items.length as 2 | 3];
      const price = Math.round(items.reduce((s, x) => s + x.price, 0) * 100) / 100;
      const saving = bundleSaving(items.map((x) => x.price), discount);
      out.push({ skus: items.map((x) => x.sku), roles: roles.slice(0, extras.length), discount, price, saving });
    }
  }
  cache.set(p.sku, out);
  return out;
}

/**
 * The discount for a bundle sent with an order, or null when it is not a real set. Checked by the rules, not by the
 * exact extras shown, so a set still counts when the page picked another lube in the meantime.
 */
export function bundleDiscount(skus: string[]): number | null {
  if (skus.length !== 2 && skus.length !== 3) return null;
  if (new Set(skus).size !== skus.length) return null;
  const [main, ...extras] = skus.map(getBySku);
  const roles = main && rolesFor(main);
  if (!roles || extras.some((p, i) => !p || !FITS[roles[i]](p))) return null;
  return BUNDLE_DISCOUNT[skus.length as 2 | 3];
}
