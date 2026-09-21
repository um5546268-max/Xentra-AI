"use client";

import posthog from "posthog-js";

let initialized = false;

export const initAnalytics = () => {
  if (initialized || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-mask]",
    },
  });
  initialized = true;
};

export const identify = (userId: string, traits?: Record<string, any>) => {
  posthog.identify(userId, traits);
};

export const track = (event: string, props?: Record<string, any>) => {
  posthog.capture(event, props);
};

export const resetAnalytics = () => {
  posthog.reset();
};