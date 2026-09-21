import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export const getAnalyticsServer = () => {
  if (!client && process.env.POSTHOG_KEY) {
    client = new PostHog(process.env.POSTHOG_KEY, {
      host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    });
  }
  return client;
};

export const trackServer = (
  userId: string,
  event: string,
  props?: Record<string, any>
) => {
  const ph = getAnalyticsServer();
  ph?.capture({ distinctId: userId, event, properties: props });
};