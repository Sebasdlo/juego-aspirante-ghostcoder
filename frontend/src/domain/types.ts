// src/modules/types.ts

export type MentorKey =
  | 'backend'
  | 'automation'
  | 'solutions'
  | 'security'
  | 'data'

/** Ítem de reto (main/random/boss) */
export type ItemDTO = {
  index: number                // 1..20
  type: 'main' | 'random' | 'boss'
  question: string
  options: string[]
  multi?: boolean
  explanation?: string

  // Metadatos opcionales desde backend
  mentorKey?: MentorKey        // main: requerido; random: a veces; boss: no aplica
  skills?: string[]
  learningObjective?: string
  integrates?: MentorKey[]     // boss: integra 2..3 áreas
}

/** Respuesta del backend al contestar un ítem */
export type AnswerResp = {
  correct: boolean
  explanation: string
  scoreDelta: number
  nextIndex: number
  score?: number
}

/** Progreso devuelto por /api/progress */
export type ProgressDTO = {
  levels: Array<{
    level: string
    setId: string
    score: number
    nextIndex: number
    status: 'open' | 'completed'
  }>
  lastPlayed?: string
}

/** Intro/narrativa de un nivel (usado en Home/Level) */
export type LevelIntroDTO = {
  title: string
  summary: string
  introMarkdown: string
  objectives: string[]
}
