import { toast } from "sonner";
import { create } from "zustand";
import {
  Task,
  getTasks,
  createTask,
  runTask,
  deleteTask,
  pauseTask,
  resumeTask,
  cancelTask,
  retryTask,
} from "./tasks";

type TasksState = {
  tasks: Task[];
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  add: (type: string, payload?: Record<string, any>) => Promise<Task | null>;
  run: (id: string) => Promise<void>;
  pause: (id: string) => Promise<void>;
  resume: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  retry: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
};

let pollHandle: ReturnType<typeof setInterval> | null = null;

export const useTasks = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

      load: async () => {
    try {
      const tasks = await getTasks();
      const seen = new Set<string>();
      const unique = tasks.filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      // Detect status transitions for notifications
      const prevTasks = get().tasks;
      const prevMap = new Map(prevTasks.map((t) => [t.id, t]));
      for (const t of unique) {
        const prev = prevMap.get(t.id);
        if (!prev) continue;
        if (
          prev.status === "running" &&
          t.status === "done"
        ) {
          toast.success(`${t.type} task finished`, {
            description: t.result?.message || "Task completed.",
          });
        }
        if (
          prev.status === "running" &&
          t.status === "failed"
        ) {
          toast.error(`${t.type} task failed`, {
            description: t.result?.error || "Something went wrong.",
          });
        }
      }

      set({ tasks: unique, loading: false, error: null });
    } catch (e: any) {
      set({ loading: false, error: e?.message || "Failed to load tasks" });
    }
  },

  add: async (type, payload = {}) => {
    try {
      const task = await createTask(type, payload);
      set((s) => {
        if (s.tasks.some((t) => t.id === task.id)) return s;
        return { tasks: [task, ...s.tasks] };
      });
      return task;
    } catch (e: any) {
      set({ error: e?.message || "Failed to create task" });
      return null;
    }
  },

  run: async (id) => {
    try {
      const updated = await runTask(id);
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (e: any) {
      set({ error: e?.message || "Failed to run task" });
    }
  },

  pause: async (id) => {
    try {
      const updated = await pauseTask(id);
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (e: any) {
      set({ error: e?.message || "Failed to pause task" });
    }
  },

  resume: async (id) => {
    try {
      const updated = await resumeTask(id);
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (e: any) {
      set({ error: e?.message || "Failed to resume task" });
    }
  },

  cancel: async (id) => {
    try {
      const updated = await cancelTask(id);
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (e: any) {
      set({ error: e?.message || "Failed to cancel task" });
    }
  },

  retry: async (id) => {
    try {
      const updated = await retryTask(id);
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (e: any) {
      set({ error: e?.message || "Failed to retry task" });
    }
  },

  remove: async (id) => {
    try {
      await deleteTask(id);
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    } catch (e: any) {
      set({ error: e?.message || "Failed to delete task" });
    }
  },

  startPolling: () => {
    if (pollHandle) return;
    get().load();
    pollHandle = setInterval(() => {
      get().load();
    }, 1500);
  },

  stopPolling: () => {
    if (pollHandle) {
      clearInterval(pollHandle);
      pollHandle = null;
    }
  },
}));