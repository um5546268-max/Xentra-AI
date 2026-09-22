"use client";
import { ComingSoon } from "@/components/ComingSoon";
import { Library } from "lucide-react";

export default function LibraryPage() {
  return (
    <ComingSoon
      title="My Library"
      description="One place for everything you've saved — notes, flashcards, sessions, files, and images."
      icon={Library}
      backHref="/app"
    />
  );
}