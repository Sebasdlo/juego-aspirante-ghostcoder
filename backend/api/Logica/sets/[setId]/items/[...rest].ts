// api/sets/[setId]/items/[index]/answer.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../../../../db/client.js'
import { withCors } from '../../../../ops/_cors.js'

const isUuid = (v:any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  
async function getItemHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok:false, error:{ message:'METHOD_NOT_ALLOWED' } })
  }

  try {
    const { setId, index } = req.query
    if (!setId || typeof setId !== 'string') {
      return res.status(400).json({ ok:false, error:{ message:'SET_ID_REQUIRED' } })
    }
    const itemIndex = Number(index)
    if (!Number.isInteger(itemIndex) || itemIndex < 16 || itemIndex > 20) {
      // Esta ruta ahora es SOLO para BOSS (16..20)
      return res.status(400).json({ ok:false, error:{ message:'BOSS_INDEX_REQUIRED_16_20' } })
    }

    // Verifica que el item sea BOSS
    const { data: item, error: itemErr } = await supabase
      .from('generated_item')
      .select(`
        id, set_id, item_index, kind, question, options_json, answer_index, explanation, mentor_id,
        mentor:character!generated_item_mentor_id_fkey ( id, name, role )
      `)
      .eq('set_id', setId)
      .eq('item_index', itemIndex)
      .maybeSingle()

    if (itemErr) throw itemErr
    if (!item) return res.status(404).json({ ok:false, error:{ message:'ITEM_NOT_FOUND' } })
    if (item.kind !== 'boss') {
      return res.status(404).json({ ok:false, error:{ message:'NOT_A_BOSS_ITEM' } })
    }

    // Info del set
    const { data: gset, error: setErr } = await supabase
      .from('generated_set')
      .select('status, next_index, level_key, boss_unlocked')
      .eq('id', setId)
      .maybeSingle()

    if (setErr) throw setErr
    if (!gset) return res.status(404).json({ ok:false, error:{ message:'SET_NOT_FOUND' } })

    // Para boss exigimos que esté desbloqueado
    if (!gset.boss_unlocked) {
      return res.status(403).json({ ok:false, error:{ message:'BOSS_LOCKED' } })
    }

    // DTO
    const rawOptions = item.options_json as any
    const options: string[] = Array.isArray(rawOptions)
      ? rawOptions
      : (typeof rawOptions === 'string' ? JSON.parse(rawOptions) : [])

    const rawMentor = (item as any).mentor
    const mentorNode = rawMentor
      ? (Array.isArray(rawMentor) ? (rawMentor[0] ?? null) : rawMentor)
      : null

    return res.json({
      ok: true,
      setId,
      level: gset.level_key,
      index: item.item_index,
      kind: item.kind,          // 'boss'
      mentor: mentorNode ? { id: mentorNode.id, name: mentorNode.name, role: mentorNode.role } : null,
      question: item.question,
      options,
      status: gset.status,
      nextIndex: gset.next_index,
      total: 20
    })
  } catch (e:any) {
    return res.status(500).json({ ok:false, error:{ message: e.message || 'INTERNAL_ERROR' } })
  }
}

async function answerHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:{message:'METHOD_NOT_ALLOWED'} })

  try {
    const { setId, index } = req.query
    const { userId, answer } = req.body ?? {}

    if (!setId || typeof setId !== 'string') return res.status(400).json({ ok:false, error:{message:'SET_ID_REQUIRED'} })
    const itemIndex = Number(index)
    if (!Number.isInteger(itemIndex) || itemIndex < 16 || itemIndex > 20)
      return res.status(400).json({ ok:false, error:{message:'BOSS_INDEX_REQUIRED_16_20'} })
    if (!userId) return res.status(400).json({ ok:false, error:{message:'USER_ID_REQUIRED'} })
    if (!isUuid(userId)) return res.status(400).json({ ok:false, error:{message:'USER_ID_INVALID_UUID'} })
    if (answer == null) return res.status(400).json({ ok:false, error:{message:'ANSWER_REQUIRED'} })

    const { data: gset } = await supabase
      .from('generated_set')
      .select('id, user_id, level_key, status, next_index, boss_unlocked')
      .eq('id', setId).maybeSingle()
    if (!gset) return res.status(404).json({ ok:false, error:{message:'SET_NOT_FOUND'} })
    if (gset.status !== 'open') return res.status(400).json({ ok:false, error:{message:' SET_NOT_OPEN-Ya repondiste las preguntas, no puedes entrar al boss'} })
    if (gset.user_id !== userId) return res.status(403).json({ ok:false, error:{message:'USER_SET_MISMATCH'} })
    if (!gset.boss_unlocked) return res.status(403).json({ ok:false, error:{message:'BOSS_LOCKED'} })

    const { data: item } = await supabase
      .from('generated_item')
      .select('answer_index, explanation, kind')
      .eq('set_id', setId)
      .eq('item_index', itemIndex)
      .maybeSingle()
    if (!item) return res.status(404).json({ ok:false, error:{message:'ITEM_NOT_FOUND'} })
    if (item.kind !== 'boss') return res.status(404).json({ ok:false, error:{message:'NOT_A_BOSS_ITEM'} })

    const { data: prev } = await supabase
      .from('attempt').select('id')
      .eq('set_id', setId).eq('user_id', userId).eq('item_index', itemIndex).maybeSingle()
    if (prev) return res.status(409).json({ ok:false, error:{message:'ALREADY_ANSWERED'} })

    const isCorrect = Number(answer) === item.answer_index

    const { error: insErr } = await supabase.from('attempt').insert({
      set_id: setId,
      user_id: userId,
      item_index: itemIndex,
      answer_given: Number(answer),
      is_correct: isCorrect
    })
    if (insErr) return res.status(500).json({ ok:false, error:{message:'ATTEMPT_INSERT_FAILED', detail:insErr.message} })

    // suma score si acierta (opcional para boss)
    if (isCorrect) {
      const { data: curPs } = await supabase
        .from('player_state').select('score')
        .eq('user_id', userId).eq('level_key', gset.level_key).maybeSingle()
      await supabase.from('player_state')
        .update({ score: (curPs?.score ?? 0) + 1 })
        .eq('user_id', userId).eq('level_key', gset.level_key)
    }

    const nextIndex = Math.min(21, itemIndex + 1)
    await supabase.from('generated_set').update({ next_index: nextIndex }).eq('id', setId)

    if (nextIndex === 21) {
      await supabase.from('generated_set').update({ status: 'completed' }).eq('id', setId)
      return res.json({
        ok:true,
        finished:true,
        correct:isCorrect,
        explanation: isCorrect ? item.explanation : undefined,
        message:'¡Nivel completado (BOSS)!'
      })
    }

    return res.json({
      ok:true,
      finished:false,
      correct:isCorrect,
      explanation: isCorrect ? item.explanation : undefined,
      nextIndex
    })
  } catch (e:any) {
    return res.status(500).json({ ok:false, error:{message:e.message || 'INTERNAL_ERROR'} })
  }
}

async function resetAttemptHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: { message: 'METHOD_NOT_ALLOWED' } })
  }

  try {
    const { setId, index } = req.query as { setId?: string; index?: string }
    const { userId } = req.body ?? {}

    if (!setId || !index) {
      return res.status(400).json({ ok: false, error: { message: 'SET_OR_INDEX_REQUIRED' } })
    }
    if (!userId) {
      return res.status(400).json({ ok: false, error: { message: 'USER_ID_REQUIRED' } })
    }

    const itemIndex = Number(index)
    if (!Number.isInteger(itemIndex)) {
      return res.status(400).json({ ok: false, error: { message: 'INDEX_INVALID' } })
    }

    // Solo permitimos resetear preguntas del Boss (16–20)
    if (itemIndex < 16 || itemIndex > 20) {
      return res.status(400).json({ ok: false, error: { message: 'INDEX_NOT_BOSS_QUESTION' } })
    }

    const { error } = await supabase
      .from('attempt')
      .delete()
      .match({
        set_id: setId,
        user_id: userId,
        item_index: itemIndex
      })

    if (error) throw error

    return res.json({ ok: true })
  } catch (e: any) {
    console.error('resetAttempt error:', e)
    return res.status(500).json({
      ok: false,
      error: { message: e?.message || 'INTERNAL_ERROR' }
    })
  }
}


async function mainHandler(req: VercelRequest, res: VercelResponse) {
  // rest puede ser: ["16"] o ["16","answer"] o ["16","resetAttempt"]
  const rawRest = (req.query as any).rest as string | string[] | undefined
  const segments = Array.isArray(rawRest)
    ? rawRest
    : typeof rawRest === 'string'
    ? rawRest.split('/')
    : []

  const indexSegment = segments[0]
  const action = segments[1] ?? null

  if (!indexSegment) {
    return res
      .status(400)
      .json({ ok: false, error: { message: 'INDEX_REQUIRED' } })
  }

  // Simulamos lo que antes hacía Vercel con [index]
  ;(req.query as any).index = indexSegment

  if (!action) {
    // GET /items/:index
    return getItemHandler(req, res)
  }

  if (action === 'answer') {
    // POST /items/:index/answer
    return answerHandler(req, res)
  }

  if (action === 'resetAttempt') {
    // POST /items/:index/resetAttempt
    return resetAttemptHandler(req, res)
  }

  return res
    .status(404)
    .json({ ok: false, error: { message: 'NOT_FOUND' } })
}

export default withCors(mainHandler)