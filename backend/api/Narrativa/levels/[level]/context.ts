import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../../../db/client.js'
import { withCors } from '../../../ops/_cors.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:{message:'METHOD_NOT_ALLOWED'} })
  const { level } = req.query
  if (!level || typeof level !== 'string') return res.status(400).json({ ok:false, error:{message:'LEVEL_REQUIRED'} })

  const { data, error } = await supabase
    .from('level_context')
    .select('title,summary,intro_markdown,objectives,locale,version')
    .eq('level_key', level)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return res.status(404).json({ ok:false, error:{message:'LEVEL_CONTEXT_NOT_FOUND'} })
  return res.json({ ok:true, level, context: data })
}

export default withCors(handler)