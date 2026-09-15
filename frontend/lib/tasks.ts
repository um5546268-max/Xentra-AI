import api from "./api";

export type TaskStatus =
  | "queued"
  | "running"
  | "done"
  | "failed"
  | "paused"
  | "cancelled";

export type Task = {
  id: string;
  type: string;
  status: TaskStatus;
  progress: number;
  payload: Record<string, any> | null;
  result: Record<string, any> | null;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
};

export const getTasks = async (): Promise<Task[]> => {
  const res = await api.get("/api/tasks");
  return res.data;
};

export const createTask = async (
  type: string,
  payload: Record<string, any> = {}
): Promise<Task> => {
  const res = await api.post("/api/tasks", { type, payload });
  return res.data;
};

export const runTask = async (id: string): Promise<Task> => {
  const res = await api.post(`/api/tasks/${id}/run`);
  return res.data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/api/tasks/${id}`, {
    transformResponse: [(data) => data],
  });
};
export const pauseTask = async (id: string): Promise<Task> => {
  const res = await api.post(`/api/tasks/${id}/pause`);
  return res.data;
};

export const resumeTask = async (id: string): Promise<Task> => {
  const res = await api.post(`/api/tasks/${id}/resume`);
  return res.data;
};

export const cancelTask = async (id: string): Promise<Task> => {
  const res = await api.post(`/api/tasks/${id}/cancel`);
  return res.data;
};

export const retryTask = async (id: string): Promise<Task> => {
  const res = await api.post(`/api/tasks/${id}/retry`);
  return res.data;
};