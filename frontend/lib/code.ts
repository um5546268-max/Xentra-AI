import api from "./api";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
export type WorkspaceTree = {
  root: string;
  entries: any[];
};

export type GitStatus = {
  is_repo: boolean;
  branch: string | null;
  files: { path: string; status: string }[];
  clean: boolean;
  ahead: number;
  behind: number;
};

export type RunResponse = {
  success: boolean;
  exit_code: number;
  stdout: string;
  stderr: string;
  command: string;
  language: string;
  timed_out?: boolean;
  interactive_hint?: string | null;
};

// ═══════════════════════════════════════════════════════════════
// FILE TREE
// ═══════════════════════════════════════════════════════════════
export const getTree = async (path: string = ""): Promise<WorkspaceTree> => {
  const res = await api.get("/api/code/tree", { params: { path } });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// READ / WRITE
// ═══════════════════════════════════════════════════════════════
export const readFile = async (path: string): Promise<{ path: string; content: string }> => {
  const res = await api.get("/api/code/read", { params: { path } });
  return res.data;
};

export const writeFile = async (path: string, content: string): Promise<void> => {
  await api.post("/api/code/write", { path, content });
};

// ═══════════════════════════════════════════════════════════════
// CREATE / RENAME / DELETE
// ═══════════════════════════════════════════════════════════════
export const createEntry = async (
  path: string,
  kind: "file" | "folder" = "file",
  content: string = ""
): Promise<{ ok: boolean; path: string; kind: string }> => {
  const res = await api.post("/api/code/create", { path, kind, content });
  return res.data;
};

export const createFolder = async (path: string) => {
  const res = await api.post("/api/code/mkdir", null, { params: { path } });
  return res.data;
};

export const renameEntry = async (oldPath: string, newPath: string) => {
  const res = await api.post("/api/code/rename", {
    old_path: oldPath,
    new_path: newPath,
  });
  return res.data;
};

export const deleteEntry = async (path: string): Promise<void> => {
  await api.delete("/api/code/entry", { params: { path } });
};

// ═══════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════
export const uploadFile = async (
  file: File,
  destPath: string = ""
): Promise<{ ok: boolean; path: string; name: string; size: number }> => {
  const form = new FormData();
  form.append("file", file);
  form.append("dest_path", destPath);
  const res = await api.post("/api/code/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════
export const runFile = async (
  path: string,
  args: string[] = []
): Promise<RunResponse> => {
  const res = await api.post("/api/code/run", { path, args });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// SYNTAX
// ═══════════════════════════════════════════════════════════════
export const checkSyntax = async (
  path: string,
  content: string
): Promise<{ ok: boolean; error?: string; note?: string }> => {
  const res = await api.post("/api/code/syntax-check", { path, content });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// DIFF
// ═══════════════════════════════════════════════════════════════
export const previewDiff = async (
  path: string,
  newContent: string
): Promise<{ diff: string }> => {
  const res = await api.post("/api/code/diff", {
    path,
    new_content: newContent,
  });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// AI ASSIST
// ═══════════════════════════════════════════════════════════════
export const askAssistant = async (
  path: string,
  instruction: string
): Promise<{ new_content: string; model: string }> => {
  const res = await api.post("/api/code/assist", { path, instruction });
  return res.data;
};

// ═══════════════════════════════════════════════════════════════
// GIT
// ═══════════════════════════════════════════════════════════════
export const gitStatus = async (): Promise<GitStatus> => {
  const res = await api.get("/api/code/git/status");
  return res.data;
};

export const gitInit = async (): Promise<{ ok: boolean; already: boolean }> => {
  const res = await api.post("/api/code/git/init");
  return res.data;
};

export const gitCommit = async (
  message: string
): Promise<{ committed: boolean; hash_short?: string; reason?: string }> => {
  const res = await api.post("/api/code/git/commit", { message });
  return res.data;
};

export const gitLog = async (limit: number = 20) => {
  const res = await api.get("/api/code/git/log", { params: { limit } });
  return res.data as { commits: any[] };
};

export const moveEntry = async (
  src: string,
  destDir: string,
  newName?: string
): Promise<{ ok: boolean; src: string; new_path: string }> => {
  const res = await api.post("/api/code/move", {
    src,
    dest_dir: destDir,
    new_name: newName,
  });
  return res.data;
};

export const debugFile = async (
  path: string,
  args: string[] = []
): Promise<RunResponse & { hint?: string; mode?: string }> => {
  const res = await api.post("/api/code/debug", { path, args });
  return res.data;
};

export const runTests = async (
  path?: string
): Promise<
  RunResponse & {
    mode?: string;
    framework?: string;
    summary?: { passed: number; failed: number; skipped: number; total: number };
  }
> => {
  const res = await api.post("/api/code/test", { path });
  return res.data;
};