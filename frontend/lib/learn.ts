import api from "./api";

// ── Types ──
export type Concept = {
  concept: string;
  definition: string;
  importance: number;
  prerequisites: string[];
};

export type Flashcard = {
  id: string;
  concept: string | null;
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  next_review_at: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

export type LearnSession = {
  id: string;
  title: string;
  topic: string | null;
  source_type: "topic" | "text" | "file";
  subject: string | null;         // ← NEW
  summary: string | null;
  concepts: Concept[] | null;
  created_at: string;
};

export type LearnSessionDetail = LearnSession & {
  flashcards: Flashcard[];
  latest_quiz: {
    id: string;
    questions: QuizQuestion[];
    created_at: string;
  } | null;
};

export type StudyStats = {
  total_sessions: number;
  total_flashcards: number;
  due_today: number;
  mastered: number;
};

export type QuizResult = {
  score: number;
  correct: number;
  total: number;
  details: {
    question: string;
    your_answer: number | null;
    correct_index: number;
    explanation: string;
  }[];
};

// ── API calls ──
export const learnFromTopic = async (
  topic: string,
  numConcepts: number = 8,
  subject?: string,               // ← NEW
): Promise<LearnSessionDetail> => {
  const res = await api.post("/api/learn/from-topic", {
    topic,
    num_concepts: numConcepts,
    subject: subject ?? null,     // ← NEW
  });
  return res.data;
};

export const learnFromText = async (
  title: string,
  text: string,
  subject?: string,               // ← NEW
): Promise<LearnSessionDetail> => {
  const res = await api.post("/api/learn/from-text", {
    title, text,
    subject: subject ?? null,     // ← NEW
  });
  return res.data;
};

export const listLearnSessions = async (
  subject?: string,               // ← NEW
): Promise<LearnSession[]> => {
  const res = await api.get("/api/learn/sessions", {
    params: subject ? { subject } : {},
  });
  return res.data;
};

export const getLearnSession = async (
  id: string,
): Promise<LearnSessionDetail> => {
  const res = await api.get(`/api/learn/session/${id}`);
  return res.data;
};

export const deleteLearnSession = async (id: string): Promise<void> => {
  await api.delete(`/api/learn/session/${id}`);
};

export const reviewFlashcard = async (
  cardId: string,
  quality: number, // 0..5
): Promise<Flashcard> => {
  const res = await api.post(`/api/learn/flashcard/${cardId}/review`, {
    quality,
  });
  return res.data;
};

export const submitQuiz = async (
  attemptId: string,
  answers: number[],
): Promise<QuizResult> => {
  const res = await api.post(`/api/learn/quiz/${attemptId}/submit`, {
    answers,
  });
  return res.data;
};

export const getLearnStats = async (): Promise<StudyStats> => {
  const res = await api.get("/api/learn/stats");
  return res.data;
};

export const learnFromFile = async (
  file: File,
  title?: string,
  subject?: string,               // ← NEW
): Promise<LearnSessionDetail> => {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  if (subject) formData.append("subject", subject);    // ← NEW
  const res = await api.post("/api/learn/from-file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
  return res.data;
};

// ── Mind Map ──
export type MindMapNode = {
  id: string;
  label: string;
  description: string;
  level: number;
  parent: string | null;
};

export type MindMapEdge = {
  id: string;
  source: string;
  target: string;
  label: string | null;
};

export type MindMapGraph = {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
};

export const getSessionMindMap = async (
  sessionId: string,
): Promise<MindMapGraph> => {
  const res = await api.get(`/api/learn/session/${sessionId}/mindmap`, {
    timeout: 60000,
  });
  return res.data;
};