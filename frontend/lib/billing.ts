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

export const startCheckout = async (planSlug: string): Promise<any> => {
  const res = await api.post("/api/billing/checkout", {
    plan_slug: planSlug,
  });
  return res.data;
};

// ----- Helpers -----

export const formatPrice = (cents: number, currency = "USD"): string => {
  if (cents === 0) return "Free";
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
  return `${symbol}${(cents / 100).toFixed(2)}`;
};

export const metricLabel = (key: string): string => {
  const map: Record<string, string> = {
    messages_per_day: "Messages / day",
    tasks_per_day: "Tasks / day",
    images_per_day: "Images / day",
    files_storage_mb: "File storage (MB)",
    automations_max: "Automations",
    integrations_max: "Integrations",
    voice_minutes_per_day: "Voice (min / day)",
    memory_max: "Memory entries",
    web_searches_per_day: "Web searches / day",
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