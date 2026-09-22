"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LanguagesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/learn?subject=languages");
  }, [router]);
  return null;
}