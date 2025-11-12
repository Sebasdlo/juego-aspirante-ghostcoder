import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../ops/_cors.js'
import { supabase } from '../../../../db/client.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:{message:'METHOD_NOT_ALLOWED'} })
  const setId = req.query.setId as string
  if (!setId) return res.status(400).json({ ok:false, error:{message:'SET_ID_REQUIRED'} })

  // estado del set
  const { data: gset } = await supabase
    .from('generated_set')
    .select('level_key, status, next_index, created_at, updated_at, boss_unlocked')
    .eq('id', setId)
    .maybeSingle()

  // items (para saber kind y mentor)
  const { data: items } = await supabase
    .from('generated_item')
    .select('item_index, kind, mentor_id')
    .eq('set_id', setId)

  // attempts (para saber aciertos)
  const { data: attempts } = await supabase
    .from('attempt')
    .select('item_index, is_correct, taken_at')
    .eq('set_id', setId)

  // por kind
  const byKind = { main:{total:0, correct:0}, random:{total:0, correct:0}, boss:{total:0, correct:0} as any }
  const attemptMap = new Map((attempts ?? []).map(a => [a.item_index, a]))

  ;(items ?? []).forEach(it => {
    const k = (it.kind as 'main'|'random'|'boss')
    byKind[k].total++
    if (attemptMap.get(it.item_index)?.is_correct) byKind[k].correct++
  })

 // por mentor
const mentorStats: Record<string, {total:number, correct:number}> = {}
;(items ?? []).forEach(it => {
  if (!it.mentor_id) return
  const key = it.mentor_id as string
  if (!mentorStats[key]) mentorStats[key] = { total:0, correct:0 }
  mentorStats[key].total++
  if (attemptMap.get(it.item_index)?.is_correct) mentorStats[key].correct++
})

// ==== NUEVO: Enriquecer con nombre y rol del mentor ====
const mentorIds = Object.keys(mentorStats)

let mentorsInfo: Record<string, { name:string; role:string }> = {}
if (mentorIds.length > 0) {
  const { data: mentorRows } = await supabase
    .from('character')
    .select('id, name, role')
    .in('id', mentorIds)

  for (const m of mentorRows ?? []) {
    mentorsInfo[m.id] = { name: m.name, role: m.role }
  }
}

// Combinar
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

// ==== Respuesta final ====

return res.json({
  ok: true,
  set: gset ?? null,
  totals: {
    answered: (attempts ?? []).length,
    correct: (attempts ?? []).filter(a => a.is_correct).length,
    totalItems: (items ?? []).length
  },
  byKind,
  byMentor: byMentorDetailed
})

}
export default withCors(handler)
