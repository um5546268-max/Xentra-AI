"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AllSubjectsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/learn");
  }, [router]);
  return null;
}