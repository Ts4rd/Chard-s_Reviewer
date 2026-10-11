export type Difficulty = "easy" | "mixed" | "hard";

export type StudyMode = "flashcards" | "multipleChoice" | "identification";

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  source: string;
};

export type MultipleChoice = {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  source: string;
};

export type Identification = {
  id: string;
  prompt: string;
  answer: string;
  aliases: string[];
  source: string;
};

export type LastScore = {
  mode: StudyMode;
  correct: number;
  total: number;
  at: string;
};

export type ReviewerDeck = {
  id: string;
  title: string;
  sourceName: string;
  createdAt: string;
  truncated: boolean;
  generator: "gemini" | "local";
  flashcards: Flashcard[];
  multipleChoice: MultipleChoice[];
  identification: Identification[];
  lastScore?: LastScore;
};

export type TextChunk = {
  title: string;
  text: string;
};

export type ExtractedModule = {
  title: string;
  sourceName: string;
  text: string;
  chunks: TextChunk[];
  truncated: boolean;
};

export type GenerateModes = {
  flashcards: boolean;
  multipleChoice: boolean;
  identification: boolean;
};

export type GenerateOptions = {
  questionCount: number;
  difficulty: Difficulty;
  modes: GenerateModes;
};

export type GenerateRequest = GenerateOptions & {
  title: string;
  sourceName: string;
  truncated: boolean;
  chunks: TextChunk[];
};
