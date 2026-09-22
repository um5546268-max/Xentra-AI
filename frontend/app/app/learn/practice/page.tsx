"use client";
import { ComingSoon } from "@/components/ComingSoon";
import { ClipboardList } from "lucide-react";

export default function PracticeTestsPage() {
  return (
    <ComingSoon
      title="Practice Tests"
      description="Timed exams with 30-50 questions, scored against a pass mark. Great for exam prep."
      icon={ClipboardList}
      backHref="/app/learn"
    />
  );
}