"use client";
import { ComingSoon } from "@/components/ComingSoon";
import { Languages } from "lucide-react";

export default function LanguagesPage() {
  return (
    <ComingSoon
      title="Languages"
      description="Learn any language with AI-generated flashcards, quizzes, and pronunciation guides."
      icon={Languages}
      backHref="/app/learn?subject=languages"
    />
  );
}