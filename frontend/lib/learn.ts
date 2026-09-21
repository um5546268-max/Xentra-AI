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
): Promise<LearnSessionDetail> => {
  const res = await api.post("/api/learn/from-topic", {
    topic,
    num_concepts: numConcepts,
  });
  return res.data;
};

export const learnFromText = async (
  title: string,
  text: string,
): Promise<LearnSessionDetail> => {
  const res = await api.post("/api/learn/from-text", { title, text });
  return res.data;
};

export const listLearnSessions = async (): Promise<LearnSession[]> => {
  const res = await api.get("/api/learn/sessions");
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