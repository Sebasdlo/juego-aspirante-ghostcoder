import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../ops/_cors.js'
import { supabase } from '../../../db/client.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:{message:'METHOD_NOT_ALLOWED'} })
  const userId = req.query.userId as string
  if (!userId) return res.status(400).json({ ok:false, error:{message:'USER_ID_REQUIRED'} })

  // set abierto (cualquiera, prioriza el más reciente)
  const { data: openSet } = await supabase
    .from('generated_set')
    .select('id, level_key, status, next_index, created_at')
    .eq('user_id', userId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // puntajes por nivel
  const { data: scores } = await supabase
    .from('player_state')
    .select('level_key, score')
    .eq('user_id', userId)

  return res.json({
    ok: true,
    userId,
    openSet: openSet ?? null,
    scores: scores ?? []
  })
}
export default withCors(handler)
