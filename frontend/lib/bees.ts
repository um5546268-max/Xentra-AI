import api from "./api";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export type BeeType =
  | "manager"
  | "web"
  | "computer"
  | "coding"
  | "file"
  | "shopping"
  | "maps"
  | "media"
  | "research"
  | "health"
  | "video";

export type BeeTask = {
  id: string;
  bee_type: BeeType;
  title: string;
  description: string | null;
  progress: number;
  status:
    | "queued"
    | "running"
    | "paused"
    | "verified"
    | "failed"
    | "stopped"
    | "undone";
  stoppable: boolean;
  reversible: boolean;
  verified: boolean;
  goal_dna?: Record<string, any>;
  result?: Record<string, any> | null;
  error?: string | null;
  verification?: Record<string, any> | null;
  result_url?: string | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
};

export type HiveSummary = {
  quota: number;
  active: number;
  busy: boolean;
  bees: {
    id: string;
    type: BeeType;
    title: string;
    progress: number;
    status: string;
    stoppable: boolean;
  }[];
};

export type BeeCheckpoint = {
  id: string;
  task_id: string;
  label: string;
  kind: "info" | "action" | "verify" | "undo";
  reversible: boolean;
  created_at: string;
};

// ═══════════════════════════════════════════════════════════════
// BEE STYLES — emoji + color + label per bee type
// ═══════════════════════════════════════════════════════════════
export const BEE_STYLE: Record<
  BeeType,
  { emoji: string; color: string; label: string }
> = {
  manager:  { emoji: "🤖", color: "#a855f7", label: "Manager Bee" },
  web:      { emoji: "🐝", color: "#3b82f6", label: "Web Bee" },
  computer: { emoji: "🐝", color: "#6366f1", label: "Computer Bee" },
  coding:   { emoji: "🐝", color: "#8b5cf6", label: "Coding Bee" },
  file:     { emoji: "🐝", color: "#22c55e", label: "File Bee" },
  shopping: { emoji: "🐝", color: "#f59e0b", label: "Shopping Bee" },
  maps:     { emoji: "🐝", color: "#06b6d4", label: "Maps Bee" },
  media:    { emoji: "🐝", color: "#ec4899", label: "Media Bee" },
  research: { emoji: "🐝", color: "#14b8a6", label: "Research Bee" },
  health:   { emoji: "🐝", color: "#ef4444", label: "Health Bee" },
  video:    { emoji: "🎬", color: "#ec4899", label: "Video Bee" },
};

// ═══════════════════════════════════════════════════════════════
// HIVE
// ═══════════════════════════════════════════════════════════════
export const getHive = async (): Promise<HiveSummary> => {
  const res = await api.get("/api/bees/hive");
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════
export const listBeeTasks = async (
  activeOnly = false
): Promise<BeeTask[]> => {
  const res = await api.get("/api/bees/tasks", {
    params: { active_only: activeOnly },
  });
  return res.data;
};

export const spawnBee = async (data: {
  bee_type: BeeType;
  title: string;
  description?: string;
  goal_dna?: Record<string, any>;
  reversible?: boolean;
}): Promise<BeeTask> => {
  const res = await api.post("/api/bees/spawn", data);
  return res.data;
};

export const stopBee = async (taskId: string) => {
  const res = await api.post(`/api/bees/tasks/${taskId}/stop`);
  return res.data;
};

export const stopAllBees = async () => {
  const res = await api.post("/api/bees/stop-all");
  return res.data as { stopped: number };
};

export const planSwarm = async (goal: string) => {
  const res = await api.post("/api/bees/swarm/plan", { goal });
  return res.data as {
    manager: BeeTask;
    swarm: BeeTask[];
    quota: number;
  };
};

// ═══════════════════════════════════════════════════════════════
// TIME MACHINE
// ═══════════════════════════════════════════════════════════════
export const getCheckpoints = async (
  taskId: string
): Promise<BeeCheckpoint[]> => {
  const res = await api.get(`/api/bees/tasks/${taskId}/checkpoints`);
  return res.data;
};

export const undoToCheckpoint = async (taskId: string, cpId: string) => {
  const res = await api.post(`/api/bees/tasks/${taskId}/undo/${cpId}`);
  return res.data as { reversed: boolean; reason?: string };
};