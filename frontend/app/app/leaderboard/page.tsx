"use client";
import { ComingSoon } from "@/components/ComingSoon";
import { Trophy } from "lucide-react";

export default function LeaderboardPage() {
  return (
    <ComingSoon
      title="Leaderboards"
      description="See the top learners this week and this month. Friendly competition to keep you motivated."
      icon={Trophy}
      backHref="/app"
    />
  );
}