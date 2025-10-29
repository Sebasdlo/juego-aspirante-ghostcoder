import { LEVELS } from "../../config/constants.js";

export type LevelKey = typeof LEVELS[number]["key"];

const ALIASES: Record<string, LevelKey> = {
  junior: "junior",
  jr: "junior",
  nivel_junior: "junior",
  senior: "senior",
  sr: "senior",
  nivel_senior: "senior",
};

/**
 * Normaliza una clave de nivel (p. ej., "Junior", "JR", "nivel_senior")
 * a una clave interna válida: "junior" | "senior".
 * Lanza si no existe.
 */
export function normalizeLevelKey(raw: string): LevelKey {
  const key = String(raw || "").trim().toLowerCase();
  const mapped = ALIASES[key] ?? (LEVELS.find(l => l.key === key)?.key as LevelKey | undefined);
  if (!mapped) {
    throw new Error(`Invalid level key: "${raw}"`);
  }
  return mapped;
}

/** Devuelve metadatos del nivel (título y orden) a partir de una LevelKey válida. */
export function getLevelMeta(levelKey: LevelKey) {
  const found = LEVELS.find(l => l.key === levelKey);
  if (!found) {
    throw new Error(`Level not found: "${levelKey}"`);
  }
  return { title: found.title, order: found.order };
}

/** Intenta normalizar y devolver metadatos (atajo común). */
export function resolveLevel(raw: string) {
  const key = normalizeLevelKey(raw);
  const meta = getLevelMeta(key);
  return { key, ...meta };
}
