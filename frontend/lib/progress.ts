import api from "./api";

export type ProgressStats = {
  totals: {
    points: number;
    streak_days: number;
    sessions: number;
    flashcards: number;
    quizzes: number;
    notes: number;
    goals: number;
  };
  daily_points: { date: string; points: number }[];
  weekly_sessions: { week: string; sessions: number }[];
  subject_breakdown: { subject: string; count: number }[];
  heatmap: { date: string; count: number }[];
};

export const getProgressStats = async (days = 30): Promise<ProgressStats> => {
  const res = await api.get(`/api/progress/stats?days=${days}`);
  return res.data;
};