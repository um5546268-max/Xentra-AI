"use client";

import { useEffect, useState } from "react";
import { BeeTask, HiveSummary, listBeeTasks, getHive } from "@/lib/bees";
import { BeeHivePanel } from "@/components/hive/BeeHivePanel";
import { ActiveTasksPanel } from "@/components/hive/ActiveTasksPanel";
import { SystemHealthPanel } from "@/components/hive/SystemHealthPanel";
import { QuickToolsPanel } from "@/components/hive/QuickToolsPanel";
import { BeesWorkingCard } from "@/components/hive/BeesWorkingCard";
import { StopAllButton } from "@/components/hive/StopAllButton";

export default function BeesPage() {
  const [tasks, setTasks] = useState<BeeTask[]>([]);
  const [hive, setHive] = useState<HiveSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      const [t, h] = await Promise.all([listBeeTasks(true), getHive()]);
      setTasks(t); setHive(h);
    };
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 p-4">
      {/* Main feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-100">🐝 Hive OS</h1>
          <StopAllButton />
        </div>
        {tasks.length > 0 && <BeesWorkingCard tasks={tasks} />}
      </div>

      {/* Right rail */}
      <div className="space-y-4">
        <BeeHivePanel />
        <ActiveTasksPanel />
        <SystemHealthPanel score={87} />
        <QuickToolsPanel />
      </div>
    </div>
  );
}