export type MentorName = "Camila" | "Hernán" | "Sofía" | "Diego" | "Lucía";
export type GameItem = {
  setId: string;
  level: string;
  index: number;
  kind: "main" | "random" | "boss";
  mentor: { id: string; name: string; role: string } | null;
  question: string;
  options: string[];
  nextIndex: number;
};
