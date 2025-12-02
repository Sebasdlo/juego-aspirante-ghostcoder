// backend/api/Logica/sets/summarysets.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../ops/_cors.js'
import { supabase } from '../../../db/client.js'

// 🔹 Reutilizamos la misma lógica de summary.ts pero para varios sets
async function buildSummaryForSet(setId: string) {
  // 1) Estado del set
  const { data: gset, error: setError } = await supabase
    .from('generated_set')
    .select('id, user_id, level_key, status, next_index, created_at, updated_at, boss_unlocked')
    .eq('id', setId)
    .maybeSingle()

  if (setError) {
    console.error('Error cargando generated_set:', setError)
    return null
  }
  if (!gset) return null

  // 2) Items del set (kind, mentor)
  const { data: items, error: itemsError } = await supabase
    .from('generated_item')
    .select('item_index, kind, mentor_id')
    .eq('set_id', setId)

  if (itemsError) {
    console.error('Error cargando generated_item:', itemsError)
    return null
  }

  // 3) Attempts (para aciertos)
  const { data: attempts, error: attemptsError } = await supabase
    .from('attempt')
    .select('item_index, is_correct, taken_at')
    .eq('set_id', setId)

  if (attemptsError) {
    console.error('Error cargando attempts:', attemptsError)
    return null
  }

  // 4) Estadísticas por tipo de reto
  const byKind: Record<'main' | 'random' | 'boss', { total: number; correct: number }> = {
    main: { total: 0, correct: 0 },
    random: { total: 0, correct: 0 },
    boss: { total: 0, correct: 0 }
  }

  const attemptMap = new Map((attempts ?? []).map(a => [a.item_index, a]))

  ;(items ?? []).forEach(it => {
    const k = it.kind as 'main' | 'random' | 'boss'
    if (!byKind[k]) return
    byKind[k].total++
    if (attemptMap.get(it.item_index)?.is_correct) byKind[k].correct++
  })

  // 5) Estadísticas por mentor
  const mentorStats: Record<string, { total: number; correct: number }> = {}
  ;(items ?? []).forEach(it => {
    if (!it.mentor_id) return
    const key = it.mentor_id as string
    if (!mentorStats[key]) mentorStats[key] = { total: 0, correct: 0 }
    mentorStats[key].total++
    if (attemptMap.get(it.item_index)?.is_correct) mentorStats[key].correct++
  })

  // 6) Enriquecer con nombre y rol (tabla character)
  const mentorIds = Object.keys(mentorStats)
  let mentorsInfo: Record<string, { name: string; role: string }> = {}

  if (mentorIds.length > 0) {
    const { data: mentorRows, error: mentorError } = await supabase
      .from('character')
      .select('id, name, role')
      .in('id', mentorIds)

    if (mentorError) {
      console.error('Error cargando character:', mentorError)
    } else {
      for (const m of mentorRows ?? []) {
        mentorsInfo[m.id] = { name: m.name, role: m.role }
      }
    }
  }

  const byMentorDetailed = Object.fromEntries(
    mentorIds.map(id => [
      id,
      {
        name: mentorsInfo[id]?.name ?? null,
        role: mentorsInfo[id]?.role ?? null,
        total: mentorStats[id].total,
        correct: mentorStats[id].correct
      }
    ])
  )

  // 7) Objeto resumen (mismo formato que /sets/[setId]/summary)
  return {
    set: {
      level_key: gset.level_key,
      status: gset.status,
      next_index: gset.next_index,
      created_at: gset.created_at,
      updated_at: gset.updated_at,
      boss_unlocked: gset.boss_unlocked
    },
    setId: gset.id,
    user_id: gset.user_id,
    totals: {
      answered: (attempts ?? []).length,
      correct: (attempts ?? []).filter(a => a.is_correct).length,
      totalItems: (items ?? []).length
    },
    byKind,
    byMentor: byMentorDetailed
  }
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ ok: false, error: { message: 'METHOD_NOT_ALLOWED' } })
  }

  const userId = req.query.userId as string
  if (!userId) {
    return res
      .status(400)
      .json({ ok: false, error: { message: 'USER_ID_REQUIRED' } })
  }

  // 🔎 Traer TODOS los sets COMPLETED de este usuario (ej: junior, senior, master)
  const { data: sets, error } = await supabase
    .from('generated_set')
    .select('id, level_key, status, next_index, boss_unlocked, created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .eq('next_index', 21)       // como en tu INSERT (set completo 20+boss)
    .eq('boss_unlocked', true)  // opcional: solo si el boss fue desbloqueado
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error cargando sets completados:', error)
    return res
      .status(500)
      .json({ ok: false, error: { message: 'SET_QUERY_FAILED' } })
  }

  const summaries = []

  for (const s of sets ?? []) {
    const summary = await buildSummaryForSet(s.id)
    if (summary) {
      summaries.push(summary)
    }
  }

  return res.json({
    ok: true,
    summaries
  })
}

export default withCors(handler)
