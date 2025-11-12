// api/sets/[setId]/items/[index]/answer.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../../../../../db/client.js'
import { withCors } from '../../../../../ops/_cors.js'

const isUuid = (v:any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)

async function handler(req: VercelRequest, res: VercelResponse) {
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
    if (gset.status !== 'open') return res.status(400).json({ ok:false, error:{message:'SET_NOT_OPEN'} })
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

export default withCors(handler)
