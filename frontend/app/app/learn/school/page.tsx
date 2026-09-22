"use client";
import { ComingSoon } from "@/components/ComingSoon";
import { GraduationCap } from "lucide-react";

export default function SchoolPage() {
  return (
    <ComingSoon
      title="School / College"
      description="Upload class notes, textbooks, and lectures. Get flashcards and quizzes tailored to your syllabus."
      icon={GraduationCap}
      backHref="/app/learn?subject=school"
    />
  );
}