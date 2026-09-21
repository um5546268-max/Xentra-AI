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

export type Briefing = {
  message: string;
  generated_at: string;
  due_flashcards: number;
  total_sessions: number;
  recent_session: { id: string; title: string } | null;
  points: number;
  streak_days: number;
  level: number;
};

export const getBriefing = async (): Promise<Briefing> => {
  const res = await api.get("/api/briefing/today");
  return res.data;
};