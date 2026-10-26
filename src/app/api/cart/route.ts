import { NextResponse, type NextRequest } from "next/server";
import { getBySku, toCard } from "@/lib/catalog";

/** Current price and stock for the products in a visitor's saved cart. Unknown SKUs are left out. */
export function GET(req: NextRequest) {
  const skus = (req.nextUrl.searchParams.get("skus") ?? "").split(",").slice(0, 100);
  const products = skus.map((s) => getBySku(s.trim())).filter((p) => p !== undefined).map(toCard);
  return NextResponse.json({ products }, { headers: { "Cache-Control": "no-store" } });
}
