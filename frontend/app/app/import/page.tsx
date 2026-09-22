"use client";
import { ComingSoon } from "@/components/ComingSoon";
import { Upload } from "lucide-react";

export default function ImportPage() {
  return (
    <ComingSoon
      title="Import & Convert"
      description="Bring in files, links, videos, and audio. Xentra turns them into flashcards, quizzes, and notes automatically."
      icon={Upload}
      backHref="/app"
    />
  );
}