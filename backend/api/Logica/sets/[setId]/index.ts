import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../../../db/client.js'
import { withCors } from '../../../ops/_cors.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:{message:'METHOD_NOT_ALLOWED'} })
  const { setId } = req.query
  if (!setId || typeof setId !== 'string') return res.status(400).json({ ok:false, error:{message:'SET_ID_REQUIRED'} })

  const { data, error } = await supabase
    .from('generated_set')
    .select('id,level_key,status,next_index,created_at,updated_at')
    .eq('id', setId)
    .maybeSingle()

  if (error || !data) return res.status(404).json({ ok:false, error:{message:'SET_NOT_FOUND'} })
  return res.json({ ok:true, set: data })
}
export default withCors(handler)