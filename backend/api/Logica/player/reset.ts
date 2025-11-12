import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../ops/_cors.js'
import { supabase } from '../../../db/client.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:{message:'METHOD_NOT_ALLOWED'} })
  const { userId } = req.body ?? {}
  if (!userId) return res.status(400).json({ ok:false, error:{message:'USER_ID_REQUIRED'} })

  // 1) sets del usuario
  const { data: sets } = await supabase
    .from('generated_set')
    .select('id')
    .eq('user_id', userId)

  const setIds = (sets ?? []).map(s => s.id)
  if (setIds.length) {
    await supabase.from('attempt').delete().in('set_id', setIds)
    await supabase.from('generated_item').delete().in('set_id', setIds)
    await supabase.from('generated_set').delete().in('id', setIds)
  }

  // 2) player_state y cinematics_seen
  await supabase.from('player_state').delete().eq('user_id', userId)
  await supabase.from('level_cinematic_seen').delete().eq('user_id', userId)

  return res.json({ ok:true, clearedSets: setIds.length })
}
export default withCors(handler)
