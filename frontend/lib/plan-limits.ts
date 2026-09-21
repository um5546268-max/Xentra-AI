export type PlanId = "free" | "pro" | "ultimate";

export const PLAN_LIMITS: Record<PlanId, {
  shopping_results: number;
  youtube_results: number;
  spotify_results: number;
  media_results: number;
  messages_per_day: number;
  images_per_day: number;
}> = {
  free: {
    shopping_results: 3,
    youtube_results: 10,
    spotify_results: 10,
    media_results: 10,
    messages_per_day: 20,
    images_per_day: 5,
  },
  pro: {
    shopping_results: 5,
    youtube_results: 25,
    spotify_results: 25,
    media_results: 25,
    messages_per_day: 500,
    images_per_day: 100,
  },
  ultimate: {
    shopping_results: 10,
    youtube_results: 50,
    spotify_results: 50,
    media_results: 50,
    messages_per_day: -1,
    images_per_day: -1,
  },
};

export function getPlanLimits(plan: string | undefined): typeof PLAN_LIMITS.free {
  const key = (plan ?? "free").toLowerCase() as PlanId;
  return PLAN_LIMITS[key] ?? PLAN_LIMITS.free;
}