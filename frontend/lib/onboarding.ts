import api from "./api";

export type OnboardingStatus = {
  completed: boolean;
  display_name: string | null;
  class_level: string | null;
  learning_goal: string | null;
  interests: string[] | null;
  tour_completed: boolean;                     // ← NEW
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

// ← NEW
export const completeTour = async (): Promise<OnboardingStatus> => {
  const res = await api.post("/api/onboarding/complete-tour");
  return res.data;
};