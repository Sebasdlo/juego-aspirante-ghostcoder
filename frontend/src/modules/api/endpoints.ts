// src/modules/api/endpoints.ts
export const endpoints = {
  health: '/api/health',
  levels: '/api/levels',

  // Intro del nivel (tu backend expone GET /api/levels/:level )
  levelIntro: (level: string) => `/api/levels/${level}`,

  // Iniciar nivel → devuelve setId, nextIndex, score...
  startLevel: (level: string) => `/api/levels/${level}/start`,

  // Ítem y respuesta
  item: (setId: string, index: number) => `/api/sets/${setId}/items/${index}`,
  answerItem: (setId: string, index: number) => `/api/sets/${setId}/items/${index}/answer`,

  // Progreso del jugador
  progress: (userId: string) => `/api/progress?userId=${encodeURIComponent(userId)}`,
} as const
