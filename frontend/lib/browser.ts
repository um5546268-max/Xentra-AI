import api from "./api";

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
    { timeout: 90_000 }  // 90 seconds — cold Playwright start + slow sites
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