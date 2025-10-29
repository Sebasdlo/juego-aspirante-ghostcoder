import { LevelIntroDTO } from "../../types/index.js";

const narratives: Record<string, LevelIntroDTO> = {
  junior: {
    title: "Bienvenido a Junior",
    summary: "Aprenderás bases de pensamiento algorítmico.",
    introMarkdown: "## Misión\nTu objetivo es resolver 15 retos y enfrentar al jefe.",
    objectives: ["Analizar", "Resolver", "Explicar"]
  },
  senior: {
    title: "Bienvenido a Senior",
    summary: "Escenarios reales y decisiones complejas.",
    introMarkdown: "## Misión\nAplica habilidades avanzadas para superar al jefe.",
    objectives: ["Optimizar", "Diseñar", "Justificar"]
  }
};

// MVP en memoria (puedes leer de BD cuando listes LevelContext)
export async function getLevelIntro(level: string): Promise<LevelIntroDTO> {
  const found = narratives[level];
  if (!found) throw new Error("Level not found");
  return found;
}
