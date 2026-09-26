import api from "./api";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export type ShoppingIntent = {
  product_type: string;
  budget_max: number | null;
  budget_min: number | null;
  currency: string;
  use_case: string;
  priority_features: string[];
  location?: string | null;
};

export type ProductSpecs = {
  [key: string]: string | number | boolean | null;
};

export type ProductReviews = {
  summary?: string;
  positives?: string[];
  negatives?: string[];
  average?: number;
  count?: number;
};

export type EnrichedProduct = {
  title: string;
  product_name?: string;
  url: string;
  image?: string;
  price: number | null;
  currency: string;
  brand?: string;
  rating?: number;
  reviews_count?: number;
  source?: string;
  site?: string; 
  specs?: ProductSpecs;
  reviews?: ProductReviews;
  score: number;
  score_reasons: string[];
  trust_level?: "high" | "medium" | "low";
};

export type ShoppingCompareResponse = {
  intent: ShoppingIntent;
  products: EnrichedProduct[];
};

export type ShoppingSearchProduct = {
  title: string;
  url: string;
  image?: string;
  price?: number | null;
  currency?: string;
  source?: string;
  site?: string;
};

export type ShoppingSearchResponse = {
  products: ShoppingSearchProduct[];
  total?: number;
};

// ═══════════════════════════════════════════════════════════════
// SEARCH — fast, cheap, no enrichment
// ═══════════════════════════════════════════════════════════════
export const shoppingSearch = async (
  query: string,
  maxResults: number = 5
): Promise<ShoppingSearchResponse> => {
  const res = await api.get("/api/shopping/search", {
    params: { q: query, max_results: maxResults },
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// COMPARE — deep, slower (fetches + enriches + ranks)
// Uses POST so we can send a larger structured request body
// ═══════════════════════════════════════════════════════════════
export const shoppingCompare = async (
  query: string,
  topN: number = 3,
  options?: {
    budget?: number | null;
    currency?: string | null;
  }
): Promise<ShoppingCompareResponse> => {
  const res = await api.post("/api/shopping/compare", {   // ← confirm endpoint in openapi
    query,
    top_n: topN,
    budget: options?.budget ?? null,
    currency: options?.currency ?? null,
  });
  return res.data;
};