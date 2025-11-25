// api/Logica/sets/[setId]/items/[index]/resetAttempt.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../../../../../db/client.js'
import { withCors } from '../../../../../ops/_cors.js'

async function handler(req: VercelRequest, res: VercelResponse) {
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

export default withCors(handler)
