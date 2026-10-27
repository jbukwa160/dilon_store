// Bundle discounts, computed the same way in the browser (cart, checkout) and on the server (order).

/** A bundle the visitor took: the product first, then its extras, and the discount (0.05 = 5 %). */
export type BundleClaim = { skus: string[]; discount: number };
export type AppliedBundle = BundleClaim & { sets: number; amount: number };

const round = (n: number) => Math.round(n * 100) / 100;

/** Discount of one bundle at the given prices. */
export function bundleSaving(prices: number[], discount: number): number {
  return round(prices.reduce((s, p) => s + p, 0) * discount);
}

/**
 * Applies every bundle whose products are all in the cart, as many times as complete sets fit. Bigger bundles go first,
 * and each unit counts in one bundle only, so taking the "Двойка" and the "Тройка" of one product is two bundles.
 */
export function applyBundles(lines: { sku: string; qty: number; price: number }[], claims: BundleClaim[]) {
  const left = new Map<string, number>();
  const prices = new Map<string, number>();
  for (const l of lines) {
    left.set(l.sku, (left.get(l.sku) ?? 0) + l.qty);
    prices.set(l.sku, l.price);
  }
  const applied: AppliedBundle[] = [];
  const ordered = [...claims].sort((a, b) => b.skus.length - a.skus.length || b.discount - a.discount);
  for (const claim of ordered) {
    if (new Set(claim.skus).size !== claim.skus.length) continue;
    const sets = Math.min(...claim.skus.map((sku) => left.get(sku) ?? 0));
    if (!(sets > 0)) continue;
    for (const sku of claim.skus) left.set(sku, left.get(sku)! - sets);
    const amount = round(bundleSaving(claim.skus.map((sku) => prices.get(sku)!), claim.discount) * sets);
    applied.push({ ...claim, sets, amount });
  }
  return { applied, discount: round(applied.reduce((s, a) => s + a.amount, 0)) };
}
