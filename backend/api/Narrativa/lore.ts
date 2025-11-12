import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../db/client.js'
import { withCors } from '../ops/_cors.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:{message:'METHOD_NOT_ALLOWED'} })
  const { data, error } = await supabase
    .from('game_narrative')
    .select('slug,title,body_markdown,locale,version,updated_at')
    .eq('slug','historia-base')
    .maybeSingle()
  if (error || !data) return res.status(404).json({ ok:false, error:{message:'LORE_NOT_FOUND'} })
  return res.json({ ok:true, lore: data })
}

export default withCors(handler)