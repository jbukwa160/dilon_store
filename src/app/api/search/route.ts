import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/i18n/config";
import { paths } from "@/i18n/paths";
import { list, NAV, normalizeQuery, toCard } from "@/lib/catalog";

export function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const lp = req.nextUrl.searchParams.get("locale");
  const locale = isLocale(lp) ? lp : "bg";
  const tokens = normalizeQuery(q);
  if (!tokens.length) return NextResponse.json({ products: [], categories: [], total: 0 });

  const P = paths(locale);
  const result = list({ q }, { brands: [], price: "", stock: false, sort: "", page: 1, cat: "" }, locale);
  const categories: { href: string; label: string; count: number }[] = [];
  const matches = (words: string) => tokens.every((t) => words.includes(t));
  for (const c of NAV) {
    if (matches(`${c.name.bg} ${c.name.en}`.toLowerCase())) categories.push({ href: P.category(c.id), label: c.name[locale], count: c.count });
    for (const s of c.subs) {
      if (matches(`${s.name.bg} ${s.name.en}`.toLowerCase())) {
        categories.push({ href: P.category(c.id, s.id), label: `${c.name[locale]} › ${s.name[locale]}`, count: s.count });
      }
    }
  }

  return NextResponse.json(
    { products: result.items.slice(0, 6).map(toCard), categories: categories.slice(0, 3), total: result.total },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
