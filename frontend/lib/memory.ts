import api from "./api";

export type MemoryKind =
  | "preference"
  | "fact"
  | "project"
  | "workflow"
  | "correction"
  | "note";

export type Memory = {
  id: string;
  kind: MemoryKind;
  key: string;
  value: string;
  importance: number;
  source: string;
  pinned: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MemoryListResponse = {
  count: number;
  memories: Memory[];
};

export const listMemories = async (options?: {
  kind?: MemoryKind;
  onlyActive?: boolean;
}): Promise<MemoryListResponse> => {
  const params: any = {};
  if (options?.kind) params.kind = options.kind;
  if (options?.onlyActive !== undefined) params.only_active = options.onlyActive;

  const res = await api.get("/api/memory", { params });
  return res.data;
};

export const createMemory = async (data: {
  kind: MemoryKind;
  key: string;
  value: string;
  importance?: number;
  pinned?: boolean;
}): Promise<Memory> => {
  const res = await api.post("/api/memory", {
    kind: data.kind,
    key: data.key,
    value: data.value,
    importance: data.importance ?? 5,
    pinned: data.pinned ?? false,
  });
  return res.data;
};

export const updateMemory = async (
  id: string,
  data: {
    key?: string;
    value?: string;
    importance?: number;
    pinned?: boolean;
    active?: boolean;
  }
): Promise<Memory> => {
  const res = await api.patch(`/api/memory/${id}`, data);
  return res.data;
};

export const deleteMemory = async (id: string): Promise<void> => {
  await api.delete(`/api/memory/${id}`, {
    transformResponse: [(data) => data],
  });
};

export const deleteAllMemories = async (): Promise<void> => {
  await api.delete("/api/memory", {
    transformResponse: [(data) => data],
  });
};

// ----- Helpers -----

export const kindColor = (kind: string): string => {
  switch (kind) {
    case "preference":
      return "text-blue-300 bg-blue-500/10 border-blue-500/30";
    case "fact":
      return "text-emerald-300 bg-emerald-500/10 border-emerald-500/30";
    case "project":
      return "text-violet-300 bg-violet-500/10 border-violet-500/30";
    case "workflow":
      return "text-orange-300 bg-orange-500/10 border-orange-500/30";
    case "correction":
      return "text-red-300 bg-red-500/10 border-red-500/30";
    default:
      return "text-slate-300 bg-slate-500/10 border-slate-500/30";
  }
};

export const importanceLabel = (n: number): string => {
  if (n >= 9) return "Critical";
  if (n >= 7) return "High";
  if (n >= 5) return "Medium";
  if (n >= 3) return "Low";
  return "Trivial";
};

export const importanceColor = (n: number): string => {
  if (n >= 9) return "text-red-400";
  if (n >= 7) return "text-orange-400";
  if (n >= 5) return "text-yellow-400";
  if (n >= 3) return "text-blue-400";
  return "text-slate-400";
};