import api from "./api";

export type ScheduleType = "interval" | "daily" | "weekly";

export type AutomationCondition = {
  type: "always" | "contains" | "not_contains" | "greater_than" | "less_than" | "equals";
  field?: string;
  value?: any;
};

export type Automation = {
  id: string;
  name: string;
  description: string | null;
  schedule_type: ScheduleType;
  interval_minutes: number | null;
  time_of_day: string | null;
  day_of_week: number | null;
  task_type: string;
  task_payload: Record<string, any> | null;
  condition: AutomationCondition | null;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  last_error: string | null;
  consecutive_failures: number;
  created_at: string;
  updated_at: string;
};

export type AutomationListResponse = {
  count: number;
  automations: Automation[];
};

export const listAutomations = async (
  enabledOnly = false
): Promise<AutomationListResponse> => {
  const res = await api.get("/api/automations", {
    params: enabledOnly ? { enabled_only: true } : {},
  });
  return res.data;
};

export const createAutomation = async (data: {
  name: string;
  description?: string;
  schedule_type: ScheduleType;
  interval_minutes?: number;
  time_of_day?: string;
  day_of_week?: number;
  task_type: string;
  task_payload?: Record<string, any>;
  condition?: AutomationCondition;
  enabled?: boolean;
}): Promise<Automation> => {
  const res = await api.post("/api/automations", data);
  return res.data;
};

export const updateAutomation = async (
  id: string,
  data: Partial<Automation>
): Promise<Automation> => {
  const res = await api.patch(`/api/automations/${id}`, data);
  return res.data;
};

export const deleteAutomation = async (id: string): Promise<void> => {
  await api.delete(`/api/automations/${id}`, {
    transformResponse: [(data) => data],
  });
};

export const toggleAutomation = async (id: string): Promise<Automation> => {
  const res = await api.post(`/api/automations/${id}/toggle`);
  return res.data;
};

export const runAutomationNow = async (id: string): Promise<Automation> => {
  const res = await api.post(`/api/automations/${id}/run-now`);
  return res.data;
};

// ----- Helpers -----

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const scheduleLabel = (a: Automation): string => {
  if (a.schedule_type === "interval") {
    const m = a.interval_minutes || 0;
    if (m === 1) return "Every minute";
    if (m === 60) return "Every hour";
    if (m === 1440) return "Every day";
    return `Every ${m} min`;
  }
  if (a.schedule_type === "daily") {
    return `Daily at ${a.time_of_day || "??:??"}`;
  }
  if (a.schedule_type === "weekly") {
    const day = DAYS_OF_WEEK[a.day_of_week ?? 0];
    return `Weekly on ${day} at ${a.time_of_day || "??:??"}`;
  }
  return a.schedule_type;
};

export const conditionLabel = (c: AutomationCondition | null): string => {
  if (!c || c.type === "always") return "Always notify";
  if (c.type === "contains") return `Notify when contains "${c.value}"`;
  if (c.type === "not_contains") return `Notify when NOT contains "${c.value}"`;
  if (c.type === "greater_than") return `Notify when > ${c.value}`;
  if (c.type === "less_than") return `Notify when < ${c.value}`;
  if (c.type === "equals") return `Notify when equals "${c.value}"`;
  return c.type;
};