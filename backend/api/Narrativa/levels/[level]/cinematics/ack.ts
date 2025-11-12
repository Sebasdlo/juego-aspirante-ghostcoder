import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../../ops/_cors.js'
import { supabase } from '../../../../../db/client.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:{message:'METHOD_NOT_ALLOWED'} })
  const level = req.query.level as string
  const { userId } = req.body ?? {}
  if (!level) return res.status(400).json({ ok:false, error:{message:'LEVEL_REQUIRED'} })
  if (!userId) return res.status(400).json({ ok:false, error:{message:'USER_ID_REQUIRED'} })

  await supabase
    .from('level_cinematic_seen')
    .upsert({ user_id: userId, level_key: level }, { onConflict: 'user_id,level_key' })

  return res.json({ ok:true, level, seen:true })
}
export default withCors(handler)
