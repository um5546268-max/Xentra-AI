"use client";
import { ComingSoon } from "@/components/ComingSoon";
import { TrendingUp } from "lucide-react";

export default function ProgressPage() {
  return (
    <ComingSoon
      title="Progress & Points"
      description="See your learning over time — sessions per week, mastery charts, subject breakdown, and total points earned."
      icon={TrendingUp}
      backHref="/app"
    />
  );
}