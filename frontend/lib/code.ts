import api from "./api";

export type FileNode = {
  name: string;
  type: "file" | "directory";
  path: string;
  size?: number;
  extension?: string;
  children?: FileNode[];
};

export type WorkspaceTree = {
  root: string;
  path: string;
  entries: FileNode[];
  total: number;
  max_reached: boolean;
};

export type ReadFileResponse = {
  path: string;
  name: string;
  size: number;
  lines: number;
  content: string;
  modified_at: string;
};

export type DiffResponse = {
  path: string;
  exists: boolean;
  additions: number;
  deletions: number;
  lines_changed: number;
  diff: string;
  old_size: number;
  new_size: number;
};

export type SyntaxResponse = {
  ok: boolean;
  error: string | null;
  language: string;
};

export type RunResponse = {
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  success: boolean;
  timed_out: boolean;
  interactive_hint?: string | null;
};

export type GitStatus = {
  is_repo: boolean;
  initialized: boolean;
  branch: string | null;
  files: { status: string; path: string }[];
  clean?: boolean;
};

export const getTree = async (path: string = ""): Promise<WorkspaceTree> => {
  const res = await api.get("/api/code/tree", { params: { path } });
  return res.data;
};

export const readFile = async (path: string): Promise<ReadFileResponse> => {
  const res = await api.get("/api/code/read", { params: { path } });
  return res.data;
};

export const writeFile = async (
  path: string,
  content: string
): Promise<any> => {
  const res = await api.post("/api/code/write", { path, content, create_dirs: true });
  return res.data;
};

export const deleteFile = async (path: string): Promise<any> => {
  const res = await api.delete("/api/code/file", { params: { path } });
  return res.data;
};

export const previewDiff = async (
  path: string,
  content: string
): Promise<DiffResponse> => {
  const res = await api.post("/api/code/diff", { path, content });
  return res.data;
};

export const checkSyntax = async (
  path: string,
  content: string
): Promise<SyntaxResponse> => {
  const res = await api.post("/api/code/syntax-check", { path, content });
  return res.data;
};

export const runFile = async (
  path: string,
  args: string[] = [],
  command: string = "python"
): Promise<RunResponse> => {
  const res = await api.post(
    "/api/code/run",
    { path, args, command },
    { timeout: 60_000 }
  );
  return res.data;
};

export const gitStatus = async (): Promise<GitStatus> => {
  const res = await api.get("/api/code/git/status");
  return res.data;
};

export const gitInit = async (): Promise<any> => {
  const res = await api.post("/api/code/git/init");
  return res.data;
};

export const gitLog = async (limit: number = 10): Promise<any> => {
  const res = await api.get("/api/code/git/log", { params: { limit } });
  return res.data;
};

export const gitCommit = async (message: string): Promise<any> => {
  const res = await api.post("/api/code/git/commit", { message });
  return res.data;
};

export const askAssistant = async (
  path: string,
  instruction: string
): Promise<{ path: string; original: string; new_content: string; instruction: string }> => {
  const res = await api.post(
    "/api/code/assist",
    { path, instruction },
    { timeout: 120_000 }
  );
  return res.data;
};