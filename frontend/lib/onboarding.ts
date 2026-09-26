import api from "./api";

export type OnboardingStatus = {
  completed: boolean;
  display_name: string | null;
  class_level: string | null;
  learning_goal: string | null;
  interests: string[] | null;
  tour_completed: boolean;
};

export const getOnboardingStatus = async (): Promise<OnboardingStatus> => {
  const res = await api.get("/api/onboarding/status");
  return res.data;
};

export const submitOnboarding = async (data: {
  display_name: string;
  class_level: string;
  learning_goal: string;
  interests: string[];
}): Promise<OnboardingStatus> => {
  const res = await api.post("/api/onboarding/submit", data);
  return res.data;
};

export const completeTour = async (): Promise<OnboardingStatus> => {
  const res = await api.post("/api/onboarding/complete-tour");
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// ✅ NEW — First-time user detection
// ═══════════════════════════════════════════════════════════════
const FIRST_LAUNCH_KEY = "xentra_first_launch_done";

export function isFirstTimeUser(): boolean {
  if (typeof window === "undefined") return true;
  return !localStorage.getItem(FIRST_LAUNCH_KEY);
}

export function markFirstLaunchDone(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FIRST_LAUNCH_KEY, "true");
}

/**
 * Wipe all local cached stats, mock data, wallpaper, etc.
 * Keeps only auth token + user object.
 */
export function resetLocalUserData(): void {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key === "xentra_token" || key === "xentra_user") continue;
    if (key.startsWith("xentra-") || key.startsWith("xentra_")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((k) => localStorage.removeItem(k));
}