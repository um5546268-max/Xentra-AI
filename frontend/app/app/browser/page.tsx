"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, Loader2, ExternalLink, Camera, FileText, AlertCircle,
  MessageSquare, Check, Plus, Trash2, MousePointerClick, Type,
  Clock, Play, Layers, Sparkles, Wand2,
} from "lucide-react";
import {
  browserOpen, browserChain, browserAutoRun,
  BrowserResult, ChainResult, ChainStep, ChainStepResult,
} from "@/lib/browser";
import api from "@/lib/api";

type Mode = "single" | "chain" | "auto";

export default function BrowserPage() {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-300" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Browser Agent</h1>
            <p className="text-sm text-slate-500">
              Open a page, chain multiple steps, or let AI plan for you.
            </p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-1">
          <ModeTab active={mode === "single"} onClick={() => setMode("single")} icon={<Globe className="w-3.5 h-3.5" />} label="Single URL" />
          <ModeTab active={mode === "chain"} onClick={() => setMode("chain")} icon={<Layers className="w-3.5 h-3.5" />} label="Chain mode" />
          <ModeTab active={mode === "auto"} onClick={() => setMode("auto")} icon={<Sparkles className="w-3.5 h-3.5" />} label="Auto (AI)" />
        </div>

        {mode === "single" && <SingleMode />}
        {mode === "chain" && <ChainMode />}
        {mode === "auto" && <AutoMode />}
      </div>
    </div>
  );
}

function SingleMode() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrowserResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }
    setLoading(true); setError(null); setResult(null); setSent(false);
    try {
      const res = await browserOpen(finalUrl);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Failed to open URL");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToChat = async () => {
    if (!result || sending) return;
    setSending(true);
    try {
      const res = await api.post("/api/conversations/from-page", {
        url: result.url, title: result.title, text: result.text,
      });
      setSent(true);
      setTimeout(() => router.push(`/app/c/${res.data.id}`), 400);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Failed to create conversation");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleOpen} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com or just example.com"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none"
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading || !url.trim()} className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 transition flex items-center gap-2">
            {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Loading…</>) : ("Open")}
          </button>
        </div>
        <div className="text-xs text-slate-600">
          Try: {["example.com", "python.org", "wikipedia.org"].map((s) => (
            <button key={s} type="button" onClick={() => setUrl(s)} className="text-violet-400 hover:underline mr-2">{s}</button>
          ))}
        </div>
      </form>

      {error && <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="text-sm text-slate-500">Page</div>
              <a href={result.url} target="_blank" rel="noreferrer" className="text-xs text-violet-400 hover:underline flex items-center gap-1">Open in new tab <ExternalLink className="w-3 h-3" /></a>
            </div>
            <h2 className="text-xl font-semibold text-white">{result.title || "(no title)"}</h2>
            <div className="font-mono text-xs text-slate-500 truncate">{result.url}</div>
          </div>

          <button onClick={handleSendToChat} disabled={sending || sent || !result.text} className={`w-full rounded-xl border px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2 ${sent ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-violet-500 hover:bg-slate-900 hover:text-violet-300"}`}>
            {sent ? (<><Check className="w-4 h-4" />Conversation created — opening…</>) : sending ? (<><Loader2 className="w-4 h-4 animate-spin" />Creating conversation…</>) : (<><MessageSquare className="w-4 h-4" />Send to chat and ask about this page</>)}
          </button>

          {result.screenshot_b64 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800"><Camera className="w-4 h-4 text-slate-500" /><span className="text-xs text-slate-400 uppercase tracking-wider">Screenshot</span></div>
              <img src={`data:image/png;base64,${result.screenshot_b64}`} alt="Page screenshot" className="w-full" />
            </div>
          )}

          {result.text && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800"><FileText className="w-4 h-4 text-slate-500" /><span className="text-xs text-slate-400 uppercase tracking-wider">Extracted text · {result.text.length} chars</span></div>
              <div className="p-4 text-sm text-slate-300 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">{result.text}</div>
            </div>
          )}
        </div>
      )}

      {!result && !error && !loading && (
        <div className="text-center py-16 space-y-2 text-slate-600">
          <Globe className="w-12 h-12 mx-auto opacity-30" />
          <div className="text-sm">Enter a URL to open it in the browser agent.</div>
        </div>
      )}
    </div>
  );
}

function ChainMode() {
  const [steps, setSteps] = useState<ChainStep[]>([{ action: "open", url: "https://www.wikipedia.org" }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChainResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addStep = (action: ChainStep["action"]) => {
    const base: ChainStep = { action };
    if (action === "open") base.url = "";
    if (action === "click") base.selector = "";
    if (action === "fill") { base.selector = ""; base.value = ""; }
    if (action === "wait") base.ms = 1000;
    setSteps((prev) => [...prev, base]);
  };

  const updateStep = (i: number, patch: Partial<ChainStep>) => {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i));

  const runChain = async () => {
    if (!steps.length || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await browserChain(steps);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Chain failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-300">Steps ({steps.length})</div>
          <div className="flex gap-1.5 flex-wrap">
            <SmallAddBtn onClick={() => addStep("open")} icon={<Globe className="w-3 h-3" />} label="Open" />
            <SmallAddBtn onClick={() => addStep("click")} icon={<MousePointerClick className="w-3 h-3" />} label="Click" />
            <SmallAddBtn onClick={() => addStep("fill")} icon={<Type className="w-3 h-3" />} label="Fill" />
            <SmallAddBtn onClick={() => addStep("wait")} icon={<Clock className="w-3 h-3" />} label="Wait" />
          </div>
        </div>

        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs font-mono text-slate-400 shrink-0">{i + 1}</div>
              <div className="flex-1 space-y-1.5">
                <div className="text-xs text-slate-500 capitalize">{step.action}</div>
                {step.action === "open" && <input value={step.url || ""} onChange={(e) => updateStep(i, { url: e.target.value })} placeholder="https://example.com" className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:border-violet-500 focus:outline-none" />}
                {step.action === "click" && <input value={step.selector || ""} onChange={(e) => updateStep(i, { selector: e.target.value })} placeholder="CSS selector" className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white font-mono focus:border-violet-500 focus:outline-none" />}
                {step.action === "fill" && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <input value={step.selector || ""} onChange={(e) => updateStep(i, { selector: e.target.value })} placeholder="selector" className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white font-mono focus:border-violet-500 focus:outline-none" />
                    <input value={step.value || ""} onChange={(e) => updateStep(i, { value: e.target.value })} placeholder="value" className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:border-violet-500 focus:outline-none" />
                  </div>
                )}
                {step.action === "wait" && <input type="number" value={step.ms || 1000} onChange={(e) => updateStep(i, { ms: parseInt(e.target.value) || 1000 })} className="w-32 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:border-violet-500 focus:outline-none" />}
              </div>
              <button onClick={() => removeStep(i)} className="p-1 rounded text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>

        <button onClick={runChain} disabled={loading || steps.length === 0} className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 transition flex items-center justify-center gap-2">
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Running chain…</>) : (<><Play className="w-4 h-4" />Run chain</>)}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}

      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-sm text-emerald-300"><Check className="w-4 h-4" />Chain completed · {result.steps.length} steps</div>
            <div className="mt-2 text-xs text-slate-500">Final URL</div>
            <div className="font-mono text-xs text-slate-300 truncate">{result.final_url}</div>
          </div>
          {result.steps.map((s: ChainStepResult) => (
            <div key={s.index} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800">
                <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs font-mono text-slate-400">{s.index + 1}</div>
                <span className="text-xs text-slate-400 capitalize">{s.action}</span>
                <span className="text-xs text-slate-500 truncate flex-1">{s.url}</span>
              </div>
              <div className="p-3 space-y-2">
                {s.title && <div className="text-sm text-slate-300">{s.title}</div>}
                {s.screenshot_b64 && <img src={`data:image/png;base64,${s.screenshot_b64}`} alt={`Step ${s.index + 1}`} className="w-full rounded border border-slate-800" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AutoMode() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChainResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAuto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || loading) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await browserAutoRun(goal.trim());
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Auto mode failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={runAuto} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
          <Wand2 className="w-3.5 h-3.5" />
          Tell Xentra what to do
        </div>
        <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder='e.g. "Search Wikipedia for artificial intelligence"' rows={3} className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-violet-500 focus:outline-none" disabled={loading} />
        <div className="text-xs text-slate-600">
          Try: {["Search Wikipedia for artificial intelligence", "Look up Python on Wikipedia"].map((s) => (
            <button key={s} type="button" onClick={() => setGoal(s)} className="text-violet-400 hover:underline mr-2">{s.length > 30 ? s.slice(0, 30) + "…" : s}</button>
          ))}
        </div>
        <button type="submit" disabled={loading || !goal.trim()} className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 transition flex items-center justify-center gap-2">
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />AI is planning and running…</>) : (<><Sparkles className="w-4 h-4" />Plan + Run</>)}
        </button>
      </form>

      {error && <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300 flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}

      {result && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-sm text-emerald-300"><Check className="w-4 h-4" />AI completed the task in {result.steps.length} steps</div>
            <div className="mt-2 text-xs text-slate-500">Final title</div>
            <div className="text-sm text-slate-200">{result.final_title || "(no title)"}</div>
          </div>
          {result.steps.map((s: ChainStepResult) => (
            <div key={s.index} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800">
                <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs font-mono text-slate-400">{s.index + 1}</div>
                <span className="text-xs text-slate-400 capitalize">{s.action}</span>
                <span className="text-xs text-slate-500 truncate flex-1">{s.url}</span>
              </div>
              <div className="p-3 space-y-2">
                {s.title && <div className="text-sm text-slate-300">{s.title}</div>}
                {s.screenshot_b64 && <img src={`data:image/png;base64,${s.screenshot_b64}`} alt={`Step ${s.index + 1}`} className="w-full rounded border border-slate-800" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${active ? "border-violet-500 bg-violet-500/20 text-violet-300" : "border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"}`}>
      {icon}{label}
    </button>
  );
}

function SmallAddBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400 hover:text-violet-300 hover:border-violet-500 transition">
      <Plus className="w-3 h-3" />{icon}{label}
    </button>
  );
}