// src/modules/store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ProgressState = {
  levelKey?: string | null
  setId?: string | null
  nextIndex?: number | null
  score?: number | null
  status?: 'open' | 'completed' | null
}

type StoreState = {
  // Progreso del jugador
  progress: ProgressState

  // Contadores auxiliares (Challenge usa aleatorios)
  randomLeft: number
  mentor?: string | null

  // --- Getters auxiliares que usa tu UI ---
  getRandomLeft: () => number

  // --- Mutadores que tus pantallas YA llaman ---
  startProgress: (p: { levelKey: string; setId: string; nextIndex?: number }) => void
  setProgress: (p: Partial<ProgressState>) => void
  applyAnswerResult: (p: { score?: number; nextIndex?: number; status?: 'open'|'completed' }) => void

  addScore: (delta: number) => void
  setNextIndex: (i: number) => void
  setSetId: (id: string) => void

  selectMentor: (key?: string | null) => void
  setRandomLeft: (n: number) => void

  reset: () => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      progress: {
        levelKey: null,
        setId: null,
        nextIndex: 1,
        score: 0,
        status: 'open',
      },

      randomLeft: 3,
      mentor: null,

      // --- Getters ---
      getRandomLeft: () => get().randomLeft,

      // --- Mutadores principales ---
      startProgress: ({ levelKey, setId, nextIndex = 1 }) => {
        set({
          progress: {
            levelKey,
            setId,
            nextIndex,
            score: 0,
            status: 'open',
          },
        })
      },

      setProgress: (patch) => {
        const cur = get().progress || {}
        set({ progress: { ...cur, ...patch } })
      },

      applyAnswerResult: ({ score, nextIndex, status }) => {
        const cur = get().progress || {}
        set({
          progress: {
            ...cur,
            score: score ?? cur.score ?? 0,
            nextIndex: nextIndex ?? (typeof cur.nextIndex === 'number' ? cur.nextIndex + 1 : 1),
            status: status ?? cur.status ?? 'open',
          },
        })
      },

      addScore: (delta) => {
        const cur = get().progress || {}
        const curScore = cur.score ?? 0
        set({ progress: { ...cur, score: curScore + delta } })
      },

      setNextIndex: (i) => {
        const cur = get().progress || {}
        set({ progress: { ...cur, nextIndex: i } })
      },

      setSetId: (id) => {
        const cur = get().progress || {}
        set({ progress: { ...cur, setId: id } })
      },

      selectMentor: (key) => set({ mentor: key ?? null }),

      setRandomLeft: (n) => set({ randomLeft: Math.max(0, Number(n) || 0) }),

      reset: () => set({
        progress: {
          levelKey: null,
          setId: null,
          nextIndex: 1,
          score: 0,
          status: 'open',
        },
        randomLeft: 3,
        mentor: null,
      }),
    }),
    {
      name: 'ghostcoder-progress', // localStorage key
      partialize: (state) => ({
        progress: state.progress,
        randomLeft: state.randomLeft,
        mentor: state.mentor,
      }),
    }
  )
)
