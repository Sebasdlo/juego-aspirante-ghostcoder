// backend/api/sets/[setId]/boss/eligibility.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../../ops/_cors.js'
import { supabase } from '../../../../../db/client.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok:false, error:{ message:'METHOD_NOT_ALLOWED' } })
  }

  const setId = req.query.setId as string
  const userId = (req.query.userId as string) || undefined
  if (!setId) {
    return res.status(400).json({ ok:false, error:{ message:'SET_ID_REQUIRED' } })
  }

  // 0) Cargar set y (si viene userId) validar pertenencia
  const { data: gset, error: gErr } = await supabase
    .from('generated_set')
    .select('id, user_id, level_key, status')
    .eq('id', setId)
    .maybeSingle()

  if (gErr || !gset) {
    return res.status(404).json({ ok:false, error:{ message:'SET_NOT_FOUND' } })
  }
  if (userId && gset.user_id !== userId) {
    return res.status(403).json({ ok:false, error:{ message:'FORBIDDEN_SET_OWNERSHIP' } })
  }

  // 1) Ítems MAIN+RANDOM del set (indices 1..15)
  const { data: items, error: giErr } = await supabase
    .from('generated_item')
    .select('item_index, kind')
    .eq('set_id', setId)
    .in('kind', ['main','random'])

  if (giErr) {
    return res.status(500).json({ ok:false, error:{ message:'ITEMS_QUERY_FAILED', detail: giErr.message } })
  }

  const allowedIdx = new Set<number>()
  const kindByIdx = new Map<number, 'main'|'random'|string>()
  for (const it of (items ?? [])) {
    if (typeof it.item_index === 'number' && it.item_index >= 1 && it.item_index <= 15) {
      allowedIdx.add(it.item_index)
      kindByIdx.set(it.item_index, it.kind as any)
    }
  }

  // 2) Intentos correctos del set limitados a MAIN+RANDOM
  const idxArray = Array.from(allowedIdx)
  let correctAttempts: Array<{ item_index:number }> = []
  if (idxArray.length) {
    const { data: attempts, error: attErr } = await supabase
      .from('attempt')
      .select('item_index')
      .eq('set_id', setId)
      .eq('is_correct', true)
      .in('item_index', idxArray)

    if (attErr) {
      return res.status(500).json({ ok:false, error:{ message:'ATTEMPTS_QUERY_FAILED', detail: attErr.message } })
    }
    correctAttempts = attempts ?? []
  }

  // 3) Conteos
  let correctMain = 0
  let correctRandom = 0
  for (const a of correctAttempts) {
    const k = kindByIdx.get(a.item_index)
    if (k === 'main') correctMain += 1
    else if (k === 'random') correctRandom += 1
  }
  const correctAny = correctMain + correctRandom

  // Regla: desbloquea con >= 8 correctas entre MAIN+RANDOM (1..15)
  const needed = 10
  const eligible = correctAny >= needed

  return res.json({
    ok: true,
    setId,
    level: gset.level_key,
    correctMain,
    correctRandom,
    correctAny,
    eligible,
    needed,
    pending: Math.max(0, needed - correctAny),
    rule: '>=10 correctas entre MAIN+RANDOM (1..15)'
  })
}

export default withCors(handler)
