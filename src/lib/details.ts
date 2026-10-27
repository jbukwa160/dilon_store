import "server-only";
import data from "@/data/details.json";
import type { ProductDetails } from "./types";

// Descriptions, specs and extra photos (src/data/details.json, written by `npm run import`). Kept out of
// catalog.json so listings and the cart never load them.
const DETAILS = data as unknown as Record<string, ProductDetails>;

export const getDetails = (sku: string): ProductDetails | undefined => DETAILS[sku];
