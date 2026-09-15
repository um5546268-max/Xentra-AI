import api from "./api";

export type ShoppingIntent = {
  product_type: string;
  budget_max: number | null;
  budget_min: number | null;
  currency: string;
  use_case: string;
  priority_features: string[];
  country: string;
};

export type ProductCandidate = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  price: number | null;
  currency: string;
  image: string | null;
  rating: number | null;
  reviews_count: number | null;
  is_shopping_site: boolean;
  specs: Record<string, any>;
};

export type ShoppingSearchResponse = {
  query: string;
  intent: ShoppingIntent;
  budget: number | null;
  currency: string;
  count: number;
  products: ProductCandidate[];
};

export type EnrichedProduct = ProductCandidate & {
  product_name?: string;
  brand?: string;
  model?: string;
  highlights?: string[];
  release_year?: number | null;
  score: number;
  score_reasons: string[];
  trust_score?: number;
  trust_level?: string;
  trust_reasons?: string[];
  reviews?: {
    summary?: string;
    positives?: string[];
    negatives?: string[];
    sentiment?: string;
    sample_count?: number;
  };
  trust_signals?: Record<string, any>;
  enrich_error?: string;
};

export type ShoppingCompareResponse = {
  query: string;
  intent: ShoppingIntent;
  budget: number | null;
  currency: string;
  count: number;
  enriched_count: number;
  products: EnrichedProduct[];
};

export const shoppingSearch = async (
  q: string,
  budget?: number
): Promise<ShoppingSearchResponse> => {
  const params: any = { q };
  if (budget) params.budget = budget;
  const res = await api.get("/api/shopping/search", {
    params,
    timeout: 120_000,
  });
  return res.data;
};

export const shoppingCompare = async (
  q: string,
  topN: number = 3
): Promise<ShoppingCompareResponse> => {
  const res = await api.get("/api/shopping/compare", {
    params: { q, top_n: topN },
    timeout: 300_000,  // 5 minutes for deep enrichment
  });
  return res.data;
};