// backend/core/game/engine.ts
import { rules } from "./rules.js";
import type { ItemDTO, AnswerReq, AnswerResp } from "../../types/index.js";
import { TOTAL_MAIN, TOTAL_RANDOM, TOTAL_BOSS } from "../../config/constants.js";
import { readStore, writeStore } from "../../db/client.js";

type MemorySet = {
  setId: string;
  level: string;
  items: ItemDTO[];
  answers: Record<number, { correctIndexes: number[] }>; // siempre 1 índice
  score: number;
  nextIndex: number;
  status: "open" | "completed";
};

const TOTAL_ITEMS = TOTAL_MAIN + TOTAL_RANDOM + TOTAL_BOSS;
const rnd = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** EXACTAMENTE 4 opciones */
function makeOptions() {
  return Array.from({ length: 4 }, (_, i) => `Opción ${i + 1}`);
}

/** SOLO-UNA respuesta correcta (1..nOptions) */
function pickSingleAnswer(nOptions = 4) {
  return rnd(1, nOptions);
}

function generateItems(): {
  items: ItemDTO[];
  answers: Record<number, { correctIndexes: number[] }>;
} {
  const items: ItemDTO[] = [];
  const answers: Record<number, { correctIndexes: number[] }> = {};
  let idx = 1;

  const push = (type: ItemDTO["type"]) => {
    const options = makeOptions();                  // 4 opciones
    const correctIndex = pickSingleAnswer(options.length); // 1..4

    items.push({
      index: idx,
      type,
      question: `Pregunta ${idx} (${type})`,
      options,
      // Forzamos single-answer ⇒ no enviamos multi o lo dejamos en false
      // multi: false,              // (opcional) puedes omitir para que sea undefined
    });

    answers[idx] = { correctIndexes: [correctIndex] }; // SIEMPRE longitud 1
    idx++;
  };

  for (let i = 0; i < TOTAL_MAIN; i++) push("main");
  for (let i = 0; i < TOTAL_RANDOM; i++) push("random");
  for (let i = 0; i < TOTAL_BOSS; i++) push("boss");

  return { items, answers };
}

export function startLevel(userId: string, level: string) {
  const key = `${userId}:${level}`;
  const store = readStore();
  let s: MemorySet | undefined = store.byUserLevel[key];

  if (s && s.status === "open") return s;

  const { items, answers } = generateItems();
  s = {
    setId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    items,
    answers,
    score: 0,
    nextIndex: 1,
    status: "open",
  };

  store.byUserLevel[key] = s;
  store.bySetId[s.setId] = s;
  writeStore(store);
  return s;
}

export function getItem(setId: string, index: number | string) {
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 1) return null;

  const store = readStore();
  const s: MemorySet | undefined = store.bySetId[setId];
  if (!s) return null;

  if (!s.items || s.items.length === 0) return null;

  let it = s.items.find((x) => x.index === idx);
  if (!it && idx <= s.items.length) {
    it = s.items[idx - 1];
    if (it && it.index !== idx) it = { ...it, index: idx };
  }
  return it ?? null;
}

export function answerItem(setId: string, index: number | string, req: AnswerReq): AnswerResp {
  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 1) throw new Error("Item not found");

  const store = readStore();
  const s: MemorySet | undefined = store.bySetId[setId];
  if (!s) throw new Error("Set not found");

  const key = s.answers[idx];
  if (!key) throw new Error("Item not found");

  // NORMALIZAR: por ahora es single-answer ⇒ tomamos SOLO un índice 1..4
  const givenSingle =
    typeof req.answerIndex === "number"
      ? req.answerIndex
      : Array.isArray(req.answerKeys) && req.answerKeys.length > 0
      ? req.answerKeys[0]
      : undefined;

  // Si el cliente envía array con más de uno, ignoramos extras (para no falsear)
  const correctSingle = key.correctIndexes[0];

  const ok = givenSingle === correctSingle;
  const delta = ok ? 1 : 0;

  s.score += delta;
  const total = rules?.totalItems ?? TOTAL_ITEMS;
  if (s.nextIndex === idx) s.nextIndex = Math.min(idx + 1, total);
  if (s.nextIndex > total) s.status = "completed";

  store.bySetId[setId] = s;
  const keyUser = Object.keys(store.byUserLevel).find((k) => store.byUserLevel[k]?.setId === setId);
  if (keyUser) store.byUserLevel[keyUser] = s;
  writeStore(store);

  return {
    correct: ok,
    explanation: ok
      ? "¡Correcto! Bien razonado."
      : "No es correcto. Revisa la explicación del mentor.",
    scoreDelta: delta,
    nextIndex: s.nextIndex,
  };
}

export function getProgress(userId: string) {
  const store = readStore();
  const levels = Object.entries(store.byUserLevel)
    .filter(([k, v]) => k.startsWith(`${userId}:`) && v?.setId)
    .map(([_, m]) => ({
      level: m.level,
      setId: m.setId,
      score: m.score,
      nextIndex: m.nextIndex,
      status: m.status,
    }));

  const lastPlayed = levels.length ? levels[levels.length - 1].level : undefined;
  return { levels, lastPlayed };
}

export function resetProgress(userId: string) {
  const store = readStore();

  const userLevelKeys = Object.keys(store.byUserLevel).filter((k) =>
    k.startsWith(`${userId}:`)
  );
  if (userLevelKeys.length === 0) return;

  const setIds = userLevelKeys
    .map((k) => store.byUserLevel[k]?.setId)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  for (const k of userLevelKeys) delete store.byUserLevel[k];
  for (const id of setIds) delete store.bySetId[id];

  writeStore(store);
}
