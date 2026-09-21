import api from "./api";
import { toast } from "sonner";

export type GamificationStats = {
  points: number;
  streak_days: number;
  last_active_date: string | null;
  level: number;
  xp_in_level: number;
  xp_to_next: number;
  total_points: number;
};

export const getGamificationStats = async (): Promise<GamificationStats> => {
  const res = await api.get("/api/gamification/me");
  return res.data;
};

export const dailyCheckin = async () => {
  const res = await api.post("/api/gamification/daily-checkin");
  return res.data;
};

export const showPointsToast = (points: number) => {
  if (points > 0) {
    toast.success(`+${points} points`, { duration: 2000 });
  }
};