import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../../../../db/client.js'
import { withCors } from '../../../../ops/_cors.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  // Debe ser POST (tu colección lo llama como POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ ok:false, error:{ message:'METHOD_NOT_ALLOWED' } })
  }

  const setId = typeof req.query.setId === 'string' ? req.query.setId : undefined
  // Permite userId por query o por body (preferido en body)
  const userId =
    (typeof req.body?.userId === 'string' ? req.body.userId : undefined) ??
    (typeof req.query.userId === 'string' ? req.query.userId : undefined)

  if (!setId) {
    return res.status(400).json({ ok:false, error:{ message:'SET_ID_REQUIRED' } })
  }
  if (!userId) {
    return res.status(400).json({ ok:false, error:{ message:'USER_ID_REQUIRED' } })
  }

  // 1) Traer el set (nivel, estado y si ya fue desbloqueado)
  const { data: gset, error: gErr } = await supabase
    .from('generated_set')
    .select('id, level_key, status, boss_unlocked')
    .eq('id', setId)
    .maybeSingle()

  if (gErr || !gset) {
    return res.status(404).json({ ok:false, error:{ message:'SET_NOT_FOUND' } })
  }
  if (gset.status !== 'open') {
    return res.status(400).json({ ok:false, error:{ message:'SET_NOT_OPEN-Ya repondiste las preguntas, no puedes entrar al boss' } })
  }
  if (gset.boss_unlocked) {
    return res.json({ ok:true, setId, bossUnlocked: true, already: true })
  }

  // 2) Tomar índices de MAIN+RANDOM (regla sobre lo que realmente hay en este set)
  const { data: items, error: itemsErr } = await supabase
    .from('generated_item')
    .select('item_index, kind')
    .eq('set_id', setId)
    .in('kind', ['main', 'random'])

  if (itemsErr) {
    return res.status(500).json({ ok:false, error:{ message:'ITEMS_QUERY_FAILED', detail: itemsErr.message } })
  }
  const mainRandomIndexes = (items ?? []).map(i => i.item_index)

  // Si por alguna razón aún no hay items, no hay forma de ser elegible
  if (!mainRandomIndexes.length) {
    return res.json({
      ok: true,
      setId,
      correctMainRandom: 0,
      eligible: false,
      rule: '>=10 correctas entre MAIN+RANDOM del set'
    })
  }

  // 3) Attempts correctos del usuario en esos índices
  const { data: attempts, error: attErr } = await supabase
    .from('attempt')
    .select('item_index')
    .eq('set_id', setId)
    .eq('user_id', userId)
    .eq('is_correct', true)
    .in('item_index', mainRandomIndexes)

  if (attErr) {
    return res.status(500).json({ ok:false, error:{ message:'ATTEMPTS_QUERY_FAILED', detail: attErr.message } })
  }

  const correctMainRandom = (attempts ?? []).length

  // 4) Regla de elegibilidad (igual que en eligibility): MAIN+RANDOM, umbral = 10
  const THRESHOLD = 10
  const eligible = correctMainRandom >= THRESHOLD
  if (!eligible) {
    return res.status(400).json({
      ok: false,
      error: { message: 'NOT_ELIGIBLE_FOR_BOSS' },
      meta: { setId, correctMainRandom, rule: `>=${THRESHOLD} correctas entre MAIN+RANDOM del set` }
    })
  }

  // 5) Marcar boss desbloqueado
  const { error: upErr } = await supabase
    .from('generated_set')
    .update({ boss_unlocked: true })
    .eq('id', setId)

  if (upErr) {
    return res.status(500).json({ ok:false, error:{ message:'BOSS_UNLOCK_UPDATE_FAILED', detail: upErr.message } })
  }

  return res.json({
    ok: true,
    setId,
    bossUnlocked: true,
    correctMainRandom,
    rule: `>=${THRESHOLD} correctas entre MAIN+RANDOM del set`
  })
}

export default withCors(handler)
