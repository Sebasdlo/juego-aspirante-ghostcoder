// modules/api/endpoints.ts
import { http } from './client';

const UID = () => import.meta.env.VITE_USER_ID as string;

// ------------- OPS -------------

export const healthz = () =>
  http<{ ok: true }>('/ops/healthz');

// --------- NARRATIVA ----------

export const getLevelContext = (level: string) =>
  http<{ ok: true; level: string; context: any }>(
    `/Narrativa/levels/${level}/context`
  );

export const getLevelCinematics = (level: string) =>
  http<{ ok: true; cinematics: any[] }>(
    `/Narrativa/levels/${level}/cinematics`
  );

export const ackCinematics = (level: string) =>
  http<{ ok: true }>(`/Narrativa/levels/${level}/cinematics/ack`, {
    method: 'POST',
    body: JSON.stringify({ userId: UID() })
  });

export const startLevel = (level: string) =>
  http<{ ok: true; set: any }>(`/Narrativa/levels/${level}/start`, {
    method: 'POST',
    body: JSON.stringify({ userId: UID() }),
  });

  export const getLore = () =>
  http<{ ok: true; lore?: string; body_markdown?: string; text?: string }>(
    `/Narrativa/lore`
  )
// --------- LÓGICA DEL JUEGO ----------

// DESPUÉS: acepta un levelKey opcional
export const getPlayerState = (levelKey?: string) => {
  const uid = UID()
  let url = `/Logica/player/state?userId=${uid}`

  if (levelKey) {
    url += `&levelKey=${encodeURIComponent(levelKey)}`
  }

  // la forma genérica, porque el backend devuelve { ok, userId, openSet, lastCompletedSet, scores }
  return http<any>(url)
}

export const resetPlayer = (levelKey?: string) =>
  http<{ ok: boolean; clearedSets: number; scope: 'level' | 'all' }>(
    `/Logica/player/reset`,
    {
      method: 'POST',
      body: JSON.stringify(
        levelKey
          ? { userId: UID(), levelKey }
          : { userId: UID() }       // 🔥 no enviamos undefined
      )
    }
  );


// Info cruda del set (para debug / resumen)
export const getSetById = (setId: string) =>
  http<{ ok: true; set: any }>(`/Logica/sets/${setId}`);

export const getSetSummary = (setId: string) =>
  http<{ ok: true; summary: any }>(`/Logica/sets/${setId}/summary`);

// Mentor: siguiente reto (main/random) para ese mentor
export const getMentorNextItem = (setId: string, mentorName: string) =>
  http<{
    ok: true;
    setId: string;
    level: string;
    index: number;
    kind: 'main' | 'random' | 'boss';
    mentor: { id: string; name: string; role: string } | null;
    question: string;
    options: string[];
    status: string;
    nextIndex: number;
    total: number;
  }>(
    `/Logica/sets/${setId}/mentors/${encodeURIComponent(
      mentorName
    )}/items?mode=next&userId=${UID()}`
  );

// Mentor: responder reto actual
export const answerMentorItem = (
  setId: string,
  mentorName: string,
  answer: number,
  index?: number
) =>
  http<{
    ok: true;
    correct: boolean;
    explanation?: string;
    finishedForMentor: boolean;
    nextIndexGlobal: number;
    remainingForMentor: number[];
  }>(`/Logica/sets/${setId}/mentors/${encodeURIComponent(mentorName)}/answer`, {
    method: 'POST',
    body: JSON.stringify({ userId: UID(), answer, index })
  });

// Boss: elegibilidad y desbloqueo
export const getBossEligibility = (setId: string) =>
  http<{ ok: true; setId: string; eligible: boolean; rule: string }>(
    `/Logica/sets/${setId}/boss/eligibility`
  );

export const unlockBoss = (setId: string) =>
  http<{ ok: true; eligible: boolean }>(
    `/Logica/sets/${setId}/boss/unlock`,
    {
      method: 'POST',
      body: JSON.stringify({ userId: UID() })
    }
  );

// Boss: obtener reto puntual (index 16–20)
export const getBossItem = (setId: string, index: number) =>
  http<{
    ok: true;
    setId: string;
    level: string;
    index: number;
    kind: 'boss';
    question: string;
    options: string[];
    status: string;
    nextIndex: number;
    total: number;
  }>(`/Logica/sets/${setId}/items/${index}`);

// Boss: responder reto puntual
export const answerBossItem = (setId: string, index: number, answer: number) =>
  http<{
    ok: true;
    finished: boolean;
    correct: boolean;
    nextIndex?: number;
    message?: string;
  }>(`/Logica/sets/${setId}/items/${index}/answer`, {
    method: 'POST',
    body: JSON.stringify({ userId: UID(), answer })
  });
// Boss: resetear intentos SOLO de una pregunta puntual (ej. reintentar la misma)
export const resetBossQuestion = (setId: string, index: number) =>
  http<{ ok: true }>(
    `/Logica/sets/${setId}/items/${index}/resetAttempt`,
    {
      method: 'POST',
      body: JSON.stringify({ userId: UID() })
    }
  );

// Boss: resetear TODOS los intentos del jefe (las 5 preguntas 16–20)
// para volver a empezar la evaluación desde cero
export const resetBossRun = (setId: string) =>
  http<{ ok: true }>(
    `/Logica/sets/${setId}/boss/resetAttempts`,
    {
      method: 'POST',
      body: JSON.stringify({ userId: UID() })
    }
  );
// Resumen de TODOS los sets completados del jugador (junior, senior, master…)
export const getSummarySets = () =>
  http<{ ok: true; summaries: any[] }>(
    `/Logica/sets/summarysets?userId=${UID()}`
  );
