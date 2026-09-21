import api from "./api";

export type Language = {
  key: string;
  label: string;
  description: string;
  exts: string[];
  installed: boolean;
  path: string | null;
  version: string | null;
  install_command: string;
};

export const listLanguages = async (): Promise<Language[]> => {
  const res = await api.get("/api/integrations/languages");
  return res.data.languages;
};

/**
 * Install a language. Streams progress via SSE.
 * Returns the raw Response so the caller can read the stream.
 */
export const installLanguage = (
  key: string,
  onEvent: (evt: any) => void,
  signal?: AbortSignal
): Promise<void> => {
  const token = localStorage.getItem("xentra_token");
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  return fetch(`${API_URL}/api/integrations/languages/install`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ key }),
    signal,
  }).then(async (res) => {
    if (!res.ok || !res.body) throw new Error(`Install failed: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        try {
          onEvent(JSON.parse(line.slice(5).trim()));
        } catch {}
      }
    }
  });
};