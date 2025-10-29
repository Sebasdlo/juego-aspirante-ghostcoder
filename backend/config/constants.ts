// backend/config/constants.ts
export const TOTAL_MAIN = 10;
export const TOTAL_RANDOM = 5;
export const TOTAL_BOSS = 5;

export const TOTAL_NON_BOSS = TOTAL_MAIN + TOTAL_RANDOM; // 15
export const TOTAL_ITEMS = TOTAL_NON_BOSS + TOTAL_BOSS;  // 20
export const NEEDED_TO_UNLOCK_BOSS = 12; // 75% de 15

export const LEVELS = [
  { key: "junior", title: "Nivel Junior", order: 1 },
  { key: "senior", title: "Nivel Senior", order: 2 }
] as const;

export type LevelKey = typeof LEVELS[number]["key"];
export type MentorKey = 'backend' | 'automation' | 'solutions' | 'security' | 'data'
export const MENTOR_KEYS: MentorKey[] = ['backend', 'automation', 'solutions', 'security', 'data'];