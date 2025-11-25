// api/Logica/sets/[setId]/boss/resetAttempts.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../../../../db/client.js'
import { withCors } from '../../../../ops/_cors.js'

async function handler(req: VercelRequest, res: VercelResponse) {
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

export default withCors(handler)
