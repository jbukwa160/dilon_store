import type { Locale } from "@/i18n/config";
import type { AudienceId } from "./taxonomy";

export type FeatureKey =
  | "size" | "volume" | "weight" | "count" | "clothing" | "colour"
  | "rechargeable" | "waterproof" | "app" | "remote" | "warming" | "cooling" | "suction" | "waterBased" | "siliconeBased"
  | "silicone" | "glass" | "metal" | "leather" | "lace" | "vegan" | "vibration";

/** A fact read from the product name: a key, and a value for size, volume, colour etc. */
export type Feature = [FeatureKey] | [FeatureKey, string];

/** One product of the generated catalog (src/data/catalog.json). */
export type Product = {
  /** SKU from the company export. */
  sku: string;
  /** Same in both languages (made from the English name). */
  slug: string;
  name: Record<Locale, string>;
  brand: string;
  brandSlug: string;
  category: string;
  sub: string;
  audiences: AudienceId[];
  /** Price in euro, VAT included. */
  price: number;
  /** True when the price comes from data/prices.csv, false when the import estimated it. */
  priceConfirmed: boolean;
  /** Units that can be sold right now (inventory minus reserved). */
  stock: number;
  image: string;
  ean: string;
  features: Feature[];
  /** Search haystack: lower-case names, brand and category words in Bulgarian, English and Latin transliteration. */
  search: string;
  created: string;
  /** Higher comes first in the default ("Recommended") order. */
  rank: number;
};

export type Brand = { slug: string; name: string; count: number };

/** The part of a product that client components (cart, search suggestions) need, in both languages. */
export type CardProduct = Pick<Product, "sku" | "slug" | "name" | "brand" | "price" | "image" | "stock">;
