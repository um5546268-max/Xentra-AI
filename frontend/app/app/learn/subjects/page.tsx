"use client";
import { ComingSoon } from "@/components/ComingSoon";
import { BookOpen } from "lucide-react";

export default function AllSubjectsPage() {
  return (
    <ComingSoon
      title="All Subjects"
      description="Browse all your subjects in one place. Group sessions by Languages, School, Programming, Science, and more."
      icon={BookOpen}
      backHref="/app/learn"
    />
  );
}