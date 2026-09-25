import api from "./api";

export type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: string;
  limits: Record<string, number> | null;
  features: Record<string, boolean> | null;
  display_order: number;
};

export type Subscription = {
  id: string;
  status: string;
  plan_id: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
};

export type UsageMetric = {
  used: number;
  limit: number;
  remaining: number;
};

export type BillingStatus = {
  subscription: Subscription;
  plan: Plan;
  usage: Record<string, UsageMetric>;
};

export const listPlans = async (): Promise<Plan[]> => {
  const res = await api.get("/api/billing/plans");
  return res.data.plans;
};

export const getBillingStatus = async (): Promise<BillingStatus> => {
  const res = await api.get("/api/billing/me");
  return res.data;
};

/**
 * Start a checkout. Safe — never throws.
 * Returns { ok, checkout_url?, message? }
 */
export const startCheckout = async (
  planSlug: string,
): Promise<{ ok: boolean; checkout_url?: string; message?: string }> => {
  try {
    const res = await api.post("/api/billing/checkout", {
      plan_slug: planSlug,
    });
    const data = res.data || {};
    if (data.checkout_url) {
      return { ok: true, checkout_url: data.checkout_url };
    }
    return {
      ok: false,
      message:
        "Payments are coming soon! We're finalizing our checkout. Please check back shortly.",
    };
  } catch (e: any) {
    // Don't throw — return a friendly message
    const detail =
      e?.response?.data?.detail ||
      e?.message ||
      "Could not start checkout.";
    return {
      ok: false,
      message:
        e?.response?.status === 404 || e?.response?.status === 501
          ? "Payments are coming soon! We're finalizing our checkout. Please check back shortly."
          : detail,
    };
  }
};

// ── Helpers ──

export const formatPrice = (cents: number, currency = "USD"): string => {
  if (cents === 0) return "Free";
  const symbol =
    currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "PKR" ? "₨" : "";
  return `${symbol}${(cents / 100).toFixed(2)}`;
};

export const metricLabel = (key: string): string => {
  const map: Record<string, string> = {
    messages_per_day: "AI Chats",
    tasks_per_day: "Tasks / day",
    images_per_day: "Images / day",
    files_storage_mb: "File Storage",
    automations_max: "Automations",
    integrations_max: "Integrations",
    voice_minutes_per_day: "Voice (min / day)",
    memory_max: "Memory entries",
    web_searches_per_day: "Web searches / day",
    learning_max: "Learning",
    ai_agents_max: "AI Agents",
  };
  return map[key] || key.replace(/_/g, " ");
};

export const usageColor = (used: number, limit: number): string => {
  if (limit === -1) return "bg-violet-500";
  const pct = used / limit;
  if (pct >= 0.9) return "bg-red-500";
  if (pct >= 0.7) return "bg-yellow-500";
  return "bg-emerald-500";
};