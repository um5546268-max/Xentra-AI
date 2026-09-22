import api from "./api";

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  target: number;
  current: number;
  unit: string;
  subject: string | null;
  deadline: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export const listGoals = async (): Promise<Goal[]> => {
  const res = await api.get("/api/goals");
  return res.data;
};

export const createGoal = async (data: {
  title: string;
  description?: string | null;
  target?: number;
  current?: number;
  unit?: string;
  subject?: string | null;
  deadline?: string | null;
}): Promise<Goal> => {
  const res = await api.post("/api/goals", data);
  return res.data;
};

export const updateGoal = async (
  id: string,
  data: Partial<Goal>,
): Promise<Goal> => {
  const res = await api.patch(`/api/goals/${id}`, data);
  return res.data;
};

export const bumpGoal = async (id: string, amount = 1): Promise<Goal> => {
  const res = await api.post(`/api/goals/${id}/progress?amount=${amount}`);
  return res.data;
};

export const deleteGoal = async (id: string): Promise<void> => {
  await api.delete(`/api/goals/${id}`);
};