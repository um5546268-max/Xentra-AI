"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Plus,
  Play,
  Pause,
  Trash2,
  PlayCircle,
  Loader2,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  Calendar,
  Repeat,
} from "lucide-react";
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  runAutomationNow,
  scheduleLabel,
  conditionLabel,
  Automation,
  AutomationCondition,
  ScheduleType,
  DAYS_OF_WEEK,
} from "@/lib/automations";

const TASK_TYPES = [
  { id: "generic", label: "Generic (simulated)" },
  { id: "research", label: "Research" },
  { id: "shopping", label: "Shopping" },
  { id: "browser", label: "Browser" },
  { id: "media", label: "Media" },
  { id: "code", label: "Code" },
];

const CONDITION_TYPES = [
  { id: "always", label: "Always notify" },
  { id: "contains", label: "Result contains…" },
  { id: "not_contains", label: "Result does NOT contain…" },
  { id: "greater_than", label: "Number is greater than…" },
  { id: "less_than", label: "Number is less than…" },
  { id: "equals", label: "Equals…" },
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listAutomations();
      setAutomations(res.automations);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleToggle = async (a: Automation) => {
    try {
      const updated = await toggleAutomation(a.id);
      setAutomations((prev) =>
        prev.map((x) => (x.id === a.id ? updated : x))
      );
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleRunNow = async (a: Automation) => {
    try {
      await runAutomationNow(a.id);
      setInfo(`"${a.name}" marked due — will run at next tick`);
      setTimeout(() => setInfo(null), 3000);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleDelete = async (a: Automation) => {
    if (!confirm(`Delete "${a.name}"?`)) return;
    try {
      await deleteAutomation(a.id);
      setAutomations((prev) => prev.filter((x) => x.id !== a.id));
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      const created = await createAutomation(data);
      setAutomations((prev) => [created, ...prev]);
      setShowCreate(false);
      setInfo("Automation created");
      setTimeout(() => setInfo(null), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Automations</h1>
            <p className="text-sm text-slate-500">
              Scheduled tasks that run on their own.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New automation
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {info && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {info}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={automations.length} />
          <StatCard
            label="Enabled"
            value={automations.filter((a) => a.enabled).length}
            color="text-emerald-400"
          />
          <StatCard
            label="Total runs"
            value={automations.reduce((s, a) => s + a.run_count, 0)}
            color="text-violet-400"
          />
          <StatCard
            label="Failing"
            value={automations.filter((a) => a.consecutive_failures > 0).length}
            color="text-red-400"
          />
        </div>

        {/* List */}
        {loading && automations.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : automations.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Clock className="w-12 h-12 mx-auto text-slate-700" />
            <div className="text-sm text-slate-500">
              No automations yet. Create one to schedule recurring work.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map((a) => (
              <AutomationCard
                key={a.id}
                automation={a}
                onToggle={() => handleToggle(a)}
                onRunNow={() => handleRunNow(a)}
                onDelete={() => handleDelete(a)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateAutomationModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({
  label,
  value,
  color = "text-slate-200",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="text-xs text-slate-500 uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function AutomationCard({
  automation,
  onToggle,
  onRunNow,
  onDelete,
}: {
  automation: Automation;
  onToggle: () => void;
  onRunNow: () => void;
  onDelete: () => void;
}) {
  const hasError = automation.consecutive_failures > 0;

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        automation.enabled
          ? "border-slate-700 bg-slate-900/40"
          : "border-slate-800 bg-slate-950/40 opacity-70"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div
          className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${
            automation.enabled
              ? hasError
                ? "bg-red-500"
                : "bg-emerald-500"
              : "bg-slate-600"
          }`}
        />

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Name + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-200">
              {automation.name}
            </span>
            <span className="rounded border border-slate-700 text-slate-400 text-[10px] uppercase tracking-wide px-1.5 py-0.5">
              {automation.task_type}
            </span>
            {hasError && (
              <span className="rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] px-1.5 py-0.5 font-medium">
                {automation.consecutive_failures} failure
                {automation.consecutive_failures !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Description */}
          {automation.description && (
            <div className="text-xs text-slate-500">
              {automation.description}
            </div>
          )}

          {/* Schedule + condition */}
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              {scheduleLabel(automation)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {conditionLabel(automation.condition)}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 pt-1">
            <span>Runs: {automation.run_count}</span>
            {automation.last_run_at && (
              <span>
                Last: {new Date(automation.last_run_at).toLocaleString()}
              </span>
            )}
            {automation.next_run_at && automation.enabled && (
              <span className="text-violet-400">
                Next: {new Date(automation.next_run_at).toLocaleString()}
              </span>
            )}
          </div>

          {automation.last_error && (
            <div className="text-[11px] text-red-400 truncate">
              Last error: {automation.last_error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggle}
            className={`p-2 rounded-lg transition ${
              automation.enabled
                ? "text-emerald-400 hover:bg-slate-800"
                : "text-slate-500 hover:bg-slate-800"
            }`}
            title={automation.enabled ? "Disable" : "Enable"}
          >
            {automation.enabled ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onRunNow}
            className="p-2 rounded-lg text-violet-400 hover:bg-slate-800 transition"
            title="Run now"
          >
            <PlayCircle className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Create Modal
// ============================================================

function CreateAutomationModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: any) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("generic");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("interval");
  const [intervalMinutes, setIntervalMinutes] = useState(5);
  const [timeOfDay, setTimeOfDay] = useState("09:00");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [conditionType, setConditionType] = useState<
    AutomationCondition["type"]
  >("always");
  const [conditionField, setConditionField] = useState("result.message");
  const [conditionValue, setConditionValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: any = {
      name: name.trim(),
      description: description.trim() || undefined,
      schedule_type: scheduleType,
      task_type: taskType,
      task_payload: {},
      enabled: true,
    };

    if (scheduleType === "interval") {
      data.interval_minutes = intervalMinutes;
    } else {
      data.time_of_day = timeOfDay;
      if (scheduleType === "weekly") {
        data.day_of_week = dayOfWeek;
      }
    }

    if (conditionType !== "always") {
      const cond: AutomationCondition = { type: conditionType };
      if (conditionType === "contains" || conditionType === "not_contains") {
        cond.field = conditionField;
        cond.value = conditionValue;
      } else if (
        conditionType === "greater_than" ||
        conditionType === "less_than"
      ) {
        cond.field = conditionField;
        cond.value = parseFloat(conditionValue) || 0;
      } else if (conditionType === "equals") {
        cond.field = conditionField;
        cond.value = conditionValue;
      }
      data.condition = cond;
    }

    onCreate(data);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New automation</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Daily laptop price check"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Description (optional)
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this automation do?"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Task type */}
        <div className="space-y-2">
          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Task type
          </label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
          >
            {TASK_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule type */}
        <div className="space-y-2">
          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Schedule
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["interval", "daily", "weekly"] as ScheduleType[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScheduleType(s)}
                className={`rounded-lg border px-3 py-2 text-xs capitalize transition ${
                  scheduleType === s
                    ? "border-violet-500 bg-violet-500/10 text-violet-300"
                    : "border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule detail */}
        {scheduleType === "interval" && (
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider">
              Run every (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={10080}
              value={intervalMinutes}
              onChange={(e) =>
                setIntervalMinutes(parseInt(e.target.value) || 1)
              }
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
            />
            <div className="text-xs text-slate-600">
              e.g. 5 = every 5 minutes, 60 = hourly, 1440 = daily
            </div>
          </div>
        )}

        {(scheduleType === "daily" || scheduleType === "weekly") && (
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider">
              Time of day (UTC)
            </label>
            <input
              type="text"
              placeholder="HH:MM"
              pattern="\d{2}:\d{2}"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
            />
          </div>
        )}

        {scheduleType === "weekly" && (
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider">
              Day of week
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
            >
              {DAYS_OF_WEEK.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Condition */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="text-xs text-slate-500 uppercase tracking-wider">
            Notification condition
          </label>
          <select
            value={conditionType}
            onChange={(e) =>
              setConditionType(e.target.value as AutomationCondition["type"])
            }
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
          >
            {CONDITION_TYPES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {conditionType !== "always" && (
            <>
              <input
                value={conditionField}
                onChange={(e) => setConditionField(e.target.value)}
                placeholder="Field path (e.g. result.message)"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm mt-2"
              />
              <input
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="Value to compare against"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm mt-2"
              />
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}