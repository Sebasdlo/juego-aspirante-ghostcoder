// backend/api/sets/[setId]/boss/eligibility.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../../ops/_cors.js'
import { supabase } from '../../../../../db/client.js'

async function handlerEligibility(req: VercelRequest, res: VercelResponse) {
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

async function handlerResetAttempts(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: { message: 'METHOD_NOT_ALLOWED' } })
  }

  try {
    const { setId } = req.query as { setId?: string }
    const { userId } = req.body ?? {}

    if (!setId) {
      return res.status(400).json({ ok: false, error: { message: 'SET_ID_REQUIRED' } })
    }
    if (!userId) {
      return res.status(400).json({ ok: false, error: { message: 'USER_ID_REQUIRED' } })
    }

    const { error } = await supabase
      .from('attempt')
      .delete()
      .gte('item_index', 16)
      .lte('item_index', 20)
      .match({
        set_id: setId,
        user_id: userId
      })

    if (error) throw error

    return res.json({ ok: true })
  } catch (e: any) {
    console.error('resetBossRun error:', e)
    return res.status(500).json({
      ok: false,
      error: { message: e?.message || 'INTERNAL_ERROR' }
    })
  }
}

async function handlerUnlock(req: VercelRequest, res: VercelResponse) {
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

async function mainHandler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query as { action?: string }

  if (action === 'eligibility') {
    return handlerEligibility(req, res)
  }

  if (action === 'resetAttempts') {
    return handlerResetAttempts(req, res)
  }

  if (action === 'unlock') {
    return handlerUnlock(req, res)
  }
  return res.status(404).json({ ok: false, error: { message: 'NOT_FOUND' } })
}

export default withCors(mainHandler)