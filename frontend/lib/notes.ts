import api from "./api";

export type NoteSubject =
  | "languages" | "school" | "programming" | "science" | "personal" | "other";

export type Note = {
  id: string;
  title: string;
  body: string;
  color: "default" | "violet" | "cyan" | "emerald" | "amber" | "pink";
  pinned: boolean;
  subject: NoteSubject | null;
  tags: string[] | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
};

export const listNotes = async (): Promise<Note[]> => {
  const res = await api.get("/api/notes");
  return res.data;
};

export const createNote = async (data: {
  title?: string;
  body?: string;
  color?: string;
  subject?: string | null;
  tags?: string[];
  session_id?: string | null;
}): Promise<Note> => {
  const res = await api.post("/api/notes", data);
  return res.data;
};

export const updateNote = async (
  id: string,
  data: Partial<Pick<Note, "title" | "body" | "color" | "pinned" | "subject" | "tags" | "session_id">>,
): Promise<Note> => {
  const res = await api.patch(`/api/notes/${id}`, data);
  return res.data;
};

export const deleteNote = async (id: string): Promise<void> => {
  await api.delete(`/api/notes/${id}`);
};

// ── Subject metadata ──
export const SUBJECTS: { id: NoteSubject; label: string; emoji: string; color: string }[] = [
  { id: "languages", label: "Languages", emoji: "💬", color: "violet" },
  { id: "school", label: "School", emoji: "🎓", color: "cyan" },
  { id: "programming", label: "Programming", emoji: "⌨️", color: "emerald" },
  { id: "science", label: "Science", emoji: "🔬", color: "amber" },
  { id: "personal", label: "Personal", emoji: "🎯", color: "pink" },
  { id: "other", label: "Other", emoji: "📄", color: "default" },
];