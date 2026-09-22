"use client";
import { ComingSoon } from "@/components/ComingSoon";
import { GitBranch } from "lucide-react";

export default function MindMapPage() {
  return (
    <ComingSoon
      title="Mind Map"
      description="Visualize concepts and how they connect. Explore ideas as an interactive knowledge graph."
      icon={GitBranch}
      backHref="/app/learn"
    />
  );
}