"use client";

import { useState } from "react";
import {
  ShoppingBag,
  Search,
  Loader2,
  ExternalLink,
  Star,
  TrendingUp,
  Check,
  AlertCircle,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";
import {
  shoppingCompare,
  ShoppingCompareResponse,
  EnrichedProduct,
} from "@/lib/shopping";

export default function ShoppingPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShoppingCompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setElapsed(0);

    // Count elapsed seconds
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 500);

    try {
      const res = await shoppingCompare(query.trim(), 3);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Search failed");
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Shopping Agent</h1>
            <p className="text-sm text-slate-500">
              Tell Xentra what you need. It searches, compares, and recommends.
            </p>
          </div>
        </div>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. best laptop under 100000 for university"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Find
                </>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-600">
            Try:{" "}
            {[
              "best laptop under 100000 for university",
              "wireless headphones under 20000",
              "gaming monitor under 50000",
            ].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                className="text-violet-400 hover:underline mr-2 text-left"
              >
                {s.length > 30 ? s.slice(0, 30) + "…" : s}
              </button>
            ))}
          </div>
        </form>

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6 text-center space-y-3">
            <Loader2 className="w-8 h-8 mx-auto text-violet-400 animate-spin" />
            <div className="text-sm text-slate-300">
              Xentra is working…
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <div>🔍 Searching Daraz Pakistan</div>
              <div>📄 Fetching top product pages</div>
              <div>🧠 Extracting specs & reviews</div>
              <div>⚖️ Scoring against your needs</div>
            </div>
            <div className="text-xs text-violet-400 font-mono">
              {elapsed}s elapsed · usually takes 30–60s
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Intent summary */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex flex-wrap gap-3 text-xs">
                <IntentChip label="Product" value={result.intent.product_type} />
                {result.intent.budget_max && (
                  <IntentChip
                    label="Budget"
                    value={`${result.intent.budget_max.toLocaleString()} ${result.intent.currency}`}
                  />
                )}
                <IntentChip label="Use case" value={result.intent.use_case} />
                {result.intent.priority_features.length > 0 && (
                  <IntentChip
                    label="Priorities"
                    value={result.intent.priority_features.join(", ")}
                  />
                )}
              </div>
            </div>

            {/* Products */}
            {result.products.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No products found. Try a different query.
              </div>
            ) : (
              <div className="space-y-4">
                {result.products.map((p, i) => (
                  <ProductCard key={p.url} product={p} rank={i + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Intent Chip
// ============================================================

function IntentChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5">
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-200 capitalize">{value}</span>
    </div>
  );
}

// ============================================================
// Product Card
// ============================================================

function ProductCard({
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

  const trustColor =
    product.trust_level === "high"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : product.trust_level === "medium"
      ? "border-yellow-500/40 bg-yellow-500/5"
      : "border-slate-800 bg-slate-900/40";

  return (
    <div className={`rounded-2xl border ${trustColor} p-4 space-y-4`}>
      <div className="flex gap-4">
        {/* Rank badge */}
        <div className="shrink-0">
          <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300 font-bold">
            #{rank}
          </div>
        </div>

        {/* Image */}
        {product.image && (
          <div className="shrink-0">
            <img
              src={product.image}
              alt={product.title}
              className="w-24 h-24 rounded-lg object-cover bg-slate-950"
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium text-slate-100 leading-snug">
              {product.product_name || product.title}
            </h3>
            <div className={`shrink-0 text-right ${scoreColor}`}>
              <div className="text-xs uppercase tracking-wider opacity-60">
                Match
              </div>
              <div className="text-2xl font-bold leading-none">
                {product.score}
              </div>
            </div>
          </div>

          {/* Brand + rating row */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {product.brand && (
              <span className="text-slate-400">{product.brand}</span>
            )}
            {product.rating && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Star className="w-3.5 h-3.5 fill-current" />
                {product.rating}
                {product.reviews_count && (
                  <span className="text-slate-500">
                    ({product.reviews_count})
                  </span>
                )}
              </span>
            )}
            {product.trust_level && (
              <span
                className={`flex items-center gap-1 ${
                  product.trust_level === "high"
                    ? "text-emerald-400"
                    : product.trust_level === "medium"
                    ? "text-yellow-400"
                    : "text-slate-500"
                }`}
              >
                <Shield className="w-3 h-3" />
                {product.trust_level === "high"
                  ? "Trusted"
                  : product.trust_level === "medium"
                  ? "OK"
                  : "Low trust"}
              </span>
            )}
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div>
              {product.price ? (
                <div className="text-2xl font-bold text-white">
                  {product.currency} {product.price.toLocaleString()}
                </div>
              ) : (
                <div className="text-sm text-slate-500">Price not detected</div>
              )}
              {product.source && (
                <div className="text-xs text-slate-500">
                  from {product.source}
                </div>
              )}
            </div>
            <a
              href={product.url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium hover:bg-violet-500 transition"
            >
              Buy now <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Specs grid */}
      {product.specs && Object.values(product.specs).some((v) => v) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3 border-t border-slate-800">
          {Object.entries(product.specs)
            .filter(([_, v]) => v)
            .slice(0, 8)
            .map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg bg-slate-950/60 px-2.5 py-1.5 space-y-0.5"
              >
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  {key}
                </div>
                <div className="text-xs text-slate-200 truncate">
                  {String(value)}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Score reasons */}
      {product.score_reasons.length > 0 && (
        <div className="flex items-start gap-2 pt-3 border-t border-slate-800">
          <TrendingUp className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1.5">
            {product.score_reasons.map((reason, i) => (
              <span
                key={i}
                className="rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] px-2 py-0.5"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {product.reviews?.summary && (
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
            <Star className="w-3.5 h-3.5" />
            What reviewers say
          </div>
          <div className="text-sm text-slate-300 leading-relaxed">
            {product.reviews.summary}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {product.reviews.positives?.slice(0, 3).map((p, i) => (
              <span key={i} className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> {p}
              </span>
            ))}
            {product.reviews.negatives?.slice(0, 3).map((n, i) => (
              <span key={i} className="text-red-400 flex items-center gap-1">
                <Zap className="w-3 h-3" /> {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}