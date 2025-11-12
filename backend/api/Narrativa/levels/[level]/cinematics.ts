import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../ops/_cors.js'
import { supabase } from '../../../../db/client.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:{message:'METHOD_NOT_ALLOWED'} })
  const level = req.query.level as string
  if (!level) return res.status(400).json({ ok:false, error:{message:'LEVEL_REQUIRED'} })

  const { data, error } = await supabase
    .from('level_cinematic')
    .select('order_index, content_markdown, media_url, locale, version')
    .eq('level_key', level)
    .order('order_index', { ascending: true })

  if (error || !data) return res.status(404).json({ ok:false, error:{message:'CINEMATICS_NOT_FOUND'} })
  return res.json({ ok:true, level, slides: data })
}
export default withCors(handler)
