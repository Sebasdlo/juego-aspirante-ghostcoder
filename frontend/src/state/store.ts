// state/store.ts
import { create } from 'zustand'

import {
  getPlayerState,
  resetPlayer,
  getMentorNextItem,
  answerMentorItem,
} from '@api/endpoints'

import type { GameItem } from '@domain/types'

type StoreState = {
  setId: string | null
  level: string | null
  nextIndex: number
  current: GameItem | null
  loading: boolean
  error: string | null

  // mentores cuyo set de 3 retos ya terminó
  completedMentors: string[]

  // inicializa desde el backend (player_state + generated_set abierto o último completado)
  // ahora puede recibir levelKey opcional: 'junior' | 'senior' | 'master'
  bootstrap: (levelKey?: string) => Promise<void>

  // flujo de retos por mentor
  loadMentorItem: (mentorName: string) => Promise<void>
  answerMentor: (
    mentorName: string,
    answer: number
  ) => Promise<{ finishedForMentor: boolean }>

  // marcar mentor como completado (3 retos respondidos)
  markMentorCompleted: (mentorKey: string) => void

  // borrar progreso (por nivel o global) y volver a bootstrapping
  hardReset: (levelKey?: string) => Promise<void>
}

export const useGame = create<StoreState>((set, get) => ({
  setId: null,
  level: null,
  nextIndex: 1,
  current: null,
  loading: false,
  error: null,

  completedMentors: [],

  // Cargar estado inicial del jugador desde /Logica/player/state
  bootstrap: async (levelKey?: string) => {
    try {
      set({ loading: true, error: null })

      // 👇 AHORA: le pasamos el nivel (si viene)
      const resp = await getPlayerState(levelKey)

      if (!resp?.ok) {
        set({
          loading: false,
          error: 'No se pudo cargar el estado del jugador',
        })
        return
      }

      const anyResp = resp as any

      const openSet = anyResp.openSet ?? null
      const lastCompletedSet = anyResp.lastCompletedSet ?? null

      // 👇 Elegimos la “fuente” del set:
      // 1) Primero el openSet si existe
      // 2) Si no hay openSet, usamos lastCompletedSet (simulando set activo)
      const baseSet = openSet || lastCompletedSet || null

      const setId: string | null = baseSet?.id ?? null
      // si no hay baseSet, usamos el levelKey pedido, o 'junior' por defecto
      const derivedLevelKey: string = baseSet?.level_key ?? levelKey ?? 'junior'
      const nextIndex: number = baseSet?.next_index ?? 1

      // Estado anterior (por si no hay set asociado)
      const prevCompleted = get().completedMentors

      // 🧠 Nueva lógica para completedMentors (igual que antes, pero usando setId)
      let completedMentors: string[] = []

      if (setId) {
        // Hay algún set (abierto o completado reciente) → intentamos leer su registro
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem(`gc_completedMentors_${setId}`)
            if (raw) {
              const parsed = JSON.parse(raw)
              if (Array.isArray(parsed)) {
                completedMentors = parsed
              }
            }
          } catch (e) {
            console.warn(
              'No se pudo leer completedMentors desde localStorage',
              e
            )
          }
        }
      } else {
        // No hay set asociado → conservamos lo que hubiera en memoria
        completedMentors = prevCompleted
      }

      set({
        setId,
        level: derivedLevelKey,
        nextIndex,
        completedMentors,
        loading: false,
      })
    } catch (err: any) {
      set({
        loading: false,
        error: err?.message ?? 'No se pudo cargar el estado del jugador',
      })
    }
  },

  // Pide el siguiente reto (main/random) de un mentor concreto
  loadMentorItem: async (mentorName: string) => {
    const { setId } = get()
    if (!setId) {
      throw new Error('No hay set activo')
    }

    set({ loading: true, error: null })

    try {
      const item = await getMentorNextItem(setId, mentorName)

      set({
        current: {
          setId: item.setId,
          level: item.level,
          index: item.index,
          kind: item.kind,
          mentor: item.mentor,
          question: item.question,
          options: item.options,
          nextIndex: item.nextIndex,
        },
        loading: false,
      })
    } catch (err: any) {
      set({
        loading: false,
        error: err?.message ?? 'No se pudo cargar el reto del mentor',
      })
    }
  },

  // Envía la respuesta del reto actual de un mentor
  answerMentor: async (mentorName: string, answer: number) => {
    const { setId, current } = get()
    if (!setId || !current) {
      throw new Error('Sin contexto de set / reto actual')
    }

    const res = await answerMentorItem(setId, mentorName, answer, current.index)

    return {
      finishedForMentor: res.finishedForMentor,
    }
  },

  // Marca un mentor como completado (se usará cuando finishedForMentor = true)
  markMentorCompleted: (mentorKey: string) =>
    set((state) => {
      if (state.completedMentors.includes(mentorKey)) {
        return state
      }

      const updated = [...state.completedMentors, mentorKey]

      // Guardar en localStorage asociado al set actual
      const { setId } = state
      if (typeof window !== 'undefined' && setId) {
        try {
          localStorage.setItem(
            `gc_completedMentors_${setId}`,
            JSON.stringify(updated)
          )
        } catch (e) {
          console.warn('No se pudo guardar completedMentors en localStorage', e)
        }
      }

      return { completedMentors: updated }
    }),

  hardReset: async (levelKey?: string) => {
    const { setId } = get()

    if (typeof window !== 'undefined' && setId) {
      localStorage.removeItem(`gc_completedMentors_${setId}`)
    }

    await resetPlayer(levelKey)
    // Después del reset volvemos a hacer bootstrap del mismo nivel (o global si no viene)
    await get().bootstrap(levelKey)
  },
}))
