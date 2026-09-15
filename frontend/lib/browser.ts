import api from "./api";

// ----- Single URL -----

export type BrowserResult = {
  url: string;
  title: string;
  text: string;
  screenshot_b64: string;
  error: string | null;
};

export const browserOpen = async (url: string): Promise<BrowserResult> => {
  const res = await api.post(
    "/api/browser/open",
    { url },
    { timeout: 90_000 }
  );
  return res.data;
};

export const browserClick = async (
  url: string,
  selector: string
): Promise<BrowserResult> => {
  const res = await api.post(
    "/api/browser/click",
    { url, selector },
    { timeout: 90_000 }
  );
  return res.data;
};

export const browserFill = async (
  url: string,
  fields: Record<string, string>,
  submitSelector?: string
): Promise<BrowserResult> => {
  const res = await api.post(
    "/api/browser/fill",
    {
      url,
      fields,
      submit_selector: submitSelector || null,
    },
    { timeout: 90_000 }
  );
  return res.data;
};

// ----- Chain mode -----

export type ChainStep = {
  action: "open" | "click" | "fill" | "wait" | "screenshot";
  url?: string;
  selector?: string;
  value?: string;
  ms?: number;
};

export type ChainStepResult = {
  index: number;
  action: string;
  url: string;
  title: string;
  text: string;
  screenshot_b64: string;
  error: string | null;
};

export type ChainResult = {
  steps: ChainStepResult[];
  final_url: string;
  final_title: string;
  error: string | null;
};

export const browserChain = async (
  steps: ChainStep[]
): Promise<ChainResult> => {
  const res = await api.post(
    "/api/browser/chain",
    { steps },
    { timeout: 240_000 }
  );
  return res.data;
};