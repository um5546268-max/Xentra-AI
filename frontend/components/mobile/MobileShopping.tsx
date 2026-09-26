"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Sparkles, ExternalLink, Star, Loader2, AlertCircle,
  ShoppingBag, TrendingUp,
} from "lucide-react";
import {
  shoppingCompare,
  ShoppingCompareResponse,
  EnrichedProduct,
} from "@/lib/shopping";

export default function MobileShopping() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ShoppingCompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await shoppingCompare(query.trim(), 5);
      setResult(res);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(" · ")
          : e?.message || "Search failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTIONS = [
    "best laptop under 100000 for university",
    "wireless headphones under 20000",
    "gaming monitor under 50000",
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-100">Shopping</div>
            <div className="text-[11px] text-slate-500">
              Find the best deals
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="px-4 pb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-full border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2.5 text-sm placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="shrink-0 w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 flex items-center justify-center transition active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
          </button>
        </div>

        {/* Suggestions */}
        {!result && !loading && (
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                className="text-[11px] rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-400 hover:border-emerald-500/40 hover:text-slate-200 transition"
              >
                {s.length > 28 ? s.slice(0, 28) + "…" : s}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Loading state */}
      {loading && (
        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center space-y-3">
            <Loader2 className="w-7 h-7 mx-auto text-emerald-400 animate-spin" />
            <div className="text-sm text-slate-300">Xentra is searching…</div>
            <div className="text-[11px] text-slate-500 space-y-1">
              <div>🔍 Searching across sites</div>
              <div>📄 Fetching product pages</div>
              <div>🧠 Extracting specs & reviews</div>
              <div>⚖️ Scoring against your needs</div>
            </div>
            <div className="text-[11px] text-emerald-400 font-mono">
              This usually takes 30–90s
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="px-4 pb-6 space-y-3">
          {/* Intent chips */}
          <div className="flex flex-wrap gap-2">
            {result.intent.product_type && (
              <Chip label={result.intent.product_type} />
            )}
            {result.intent.budget_max && (
              <Chip
                label={`${result.intent.budget_max.toLocaleString()} ${result.intent.currency}`}
              />
            )}
            {result.intent.use_case && <Chip label={result.intent.use_case} />}
          </div>

          {/* Products */}
          {result.products.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No products found. Try a different query.
            </div>
          ) : (
            result.products.map((p, i) => (
              <MobileProductCard key={p.url} product={p} rank={i + 1} />
            ))
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center">
            <ShoppingBag className="w-8 h-8 mx-auto text-slate-600 mb-3" />
            <div className="text-sm text-slate-400">
              Search for products and Xentra will compare prices from multiple sites.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="text-[11px] rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-slate-300 capitalize">
      {label}
    </span>
  );
}

function MobileProductCard({
  product,
  rank,
}: {
  product: EnrichedProduct;
  rank: number;
}) {
  const scoreColor =
    product.score >= 75
      ? "text-emerald-400"
      : product.score >= 55
      ? "text-yellow-400"
      : "text-slate-400";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <div className="flex gap-3 p-3">
        {/* Image */}
        <div className="relative shrink-0">
          <div className="absolute -top-1 -left-1 z-10 w-6 h-6 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-950">
            {rank}
          </div>
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="w-20 h-20 rounded-xl object-cover bg-slate-950"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-slate-950 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-slate-700" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Site badge */}
              {product.site && (
                <span className="inline-block text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/40 mb-1">
                  {product.site}
                </span>
              )}
              <h3 className="text-sm font-medium text-slate-100 leading-snug line-clamp-2">
                {product.product_name || product.title}
              </h3>
            </div>
            <div className={`shrink-0 text-right ${scoreColor}`}>
              <div className="text-[9px] uppercase tracking-wider opacity-60">
                Match
              </div>
              <div className="text-lg font-bold leading-none">
                {product.score}
              </div>
            </div>
          </div>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-1 text-[11px] text-yellow-400 mt-1">
              <Star className="w-3 h-3 fill-current" />
              {product.rating}
              {product.reviews_count && (
                <span className="text-slate-500">
                  ({product.reviews_count})
                </span>
              )}
            </div>
          )}

          {/* Price */}
          {product.price ? (
            <div className="mt-2 text-lg font-bold text-white">
              {product.currency} {product.price.toLocaleString()}
            </div>
          ) : (
            <div className="mt-2 text-xs text-slate-500">
              Price not detected
            </div>
          )}
        </div>
      </div>

      {/* Reason chips */}
      {product.score_reasons.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {product.score_reasons.slice(0, 3).map((r, i) => (
            <span
              key={i}
              className="text-[10px] rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 px-2 py-0.5"
            >
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Buy button */}
      <a
        href={product.url}
        target="_blank"
        rel="noreferrer"
        className="block w-full border-t border-slate-800 px-3 py-2.5 text-center text-xs font-semibold text-violet-400 hover:bg-slate-900 transition"
      >
        Buy now
        <ExternalLink className="w-3 h-3 inline ml-1" />
      </a>
    </div>
  );
}