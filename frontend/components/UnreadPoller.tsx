"use client";

import { useEffect } from "react";
import {
  startGlobalUnreadPoll,
  stopGlobalUnreadPoll,
} from "@/lib/use-unread-store";

export default function UnreadPoller() {
  useEffect(() => {
    startGlobalUnreadPoll();
    return () => stopGlobalUnreadPoll();
  }, []);

  return null;
}