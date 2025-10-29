// src/modules/api/services/Index.ts
import { http } from '../client'
import { endpoints } from '../endpoints'

/** Estructuras que consume la UI */
export type LevelInfo = { key: string; name: string }

export type LevelIntroDTO = {
  intro?: string | null
  scenes?: Array<{ text: string; img?: string }>
}

export type ItemDTO = {
  index?: number
  type?: 'main' | 'random' | 'boss'
  question?: string
  options?: string[]
  multi?: boolean
  explanation?: string | null
  // Campos extra que algunos componentes consultan:
  answers?: string[]     // fallback visual si no hay options
  correctIndex?: number  // solo para pintar estados en single
}

export type AnswerResp = {
  correct: boolean
  explanation: string
  scoreDelta: number
  nextIndex: number
  // Campo extra que el store/Challenge podrían leer
  score?: number
}

export type ProgressDTO = {
  level?: string | null
  levelKey?: string | null
  setId?: string | null
  score?: number | null
  nextIndex?: number | null
  status?: 'open' | 'completed'
}

export type StartResp = {
  setId: string
  level: string
  nextIndex: number
  score: number
}

const LOCAL_USER_ID = 'dev'

/** Normaliza el ítem del backend → forma que espera la UI */
function normalizeItem(raw: any): ItemDTO {
  // Pregunta: question | prompt | text
  const question =
    raw?.question ??
    raw?.prompt ??
    raw?.text ??
    null

  // Opciones: options | choices
  const options =
    Array.isArray(raw?.options) ? raw.options :
    Array.isArray(raw?.choices) ? raw.choices :
    undefined

  // Fallback visual (UI usa un arreglo para pintar botones si no hay options):
  const answers =
    Array.isArray(options) ? undefined :
    (Array.isArray(raw?.answers) ? raw.answers : undefined)

  return {
    index: typeof raw?.index === 'number' ? raw.index : (typeof raw?.id === 'number' ? raw.id : undefined),
    type: raw?.type ?? 'main',
    question: question ?? '—',
    options: Array.isArray(options) ? options : undefined,
    answers: Array.isArray(answers) ? answers : undefined,
    multi: !!(raw?.multi || raw?.multiple || raw?.allowMultiple),
    explanation: raw?.explanation ?? null,
    // correctIndex se usa solo para estados visuales cuando llega del backend
    correctIndex: typeof raw?.correctIndex === 'number' ? raw.correctIndex : undefined,
  }
}

export const Api = {
  /** Healthcheck */
  health: () => http<{ ok: boolean; service: string; ts: number }>(endpoints.health),

  /** Niveles (opcional) */
  getLevels: () => http<LevelInfo[]>(endpoints.levels),

  /** Intro/narrativa del nivel (tu backend: GET /api/levels/:level) */
  getLevelIntro: (level: string) => http<LevelIntroDTO>(endpoints.levelIntro(level)),

  /** Iniciar nivel → genera setId */
  startLevel: (level: string, userId: string = LOCAL_USER_ID) =>
    http<StartResp>(endpoints.startLevel(level), {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  /** Obtener ítem (1-based) */
  getItem: async (setId: string, index: number) => {
    const raw = await http<any>(endpoints.item(setId, index))
    return normalizeItem(raw)
  },

  /**
   * Enviar respuesta (single o multi)
   * - number     -> { answerIndex }
   * - number[]   -> { answerKeys }
   */
  answerItem: async (setId: string, index: number, choice: number | number[]) => {
    const payload = Array.isArray(choice)
      ? { answerKeys: choice }
      : { answerIndex: choice }

    const res = await http<any>(endpoints.answerItem(setId, index), {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    // Normaliza respuesta para la UI
    return {
      correct: !!res?.correct,
      explanation: res?.explanation ?? '',
      scoreDelta: Number(res?.scoreDelta ?? 0),
      nextIndex: Number(res?.nextIndex ?? (index + 1)),
      score: typeof res?.score === 'number' ? res.score : undefined,
    } as AnswerResp
  },

  /** Progreso del jugador (usa userId=dev en local) */
  progress: (userId: string = LOCAL_USER_ID) =>
    http<ProgressDTO>(endpoints.progress(userId)),

    deleteProgress: (userId: string = 'dev') =>
    http<{ ok: boolean; msg?: string }>(endpoints.progress(userId), {
      method: 'DELETE'
    }),
} as const
