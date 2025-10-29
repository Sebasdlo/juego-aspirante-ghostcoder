export type ItemType = "main" | "random" | "boss";

export interface ItemDTO {
  index: number;       // 1..20
  type: ItemType;
  question: string;
  options: string[];   // 2..6
  multi?: boolean;     // cuando existan múltiples respuestas
}

export interface AnswerReq {
  answerIndex?: number;
  answerKeys?: number[];
}

export interface AnswerResp {
  correct: boolean;
  explanation: string;
  scoreDelta: number;
  nextIndex: number; // siguiente pregunta sugerida
}

export interface LevelIntroDTO {
  title: string;
  summary: string;
  introMarkdown: string;
  objectives: string[];
}

export interface ProgressDTO {
  levels: Array<{ level: string; setId: string; score: number; nextIndex: number; status: "open" | "completed" }>;
  lastPlayed?: string;
}
