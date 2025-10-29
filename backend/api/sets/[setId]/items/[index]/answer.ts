import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../../../../api/_cors.js'
import { answerItem } from '../../../../../core/game/engine.js'

export default withCors(function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const setId = String(req.query.setId || '')
  const index = String(req.query.index || '')
  if (!setId || !index) return res.status(400).json({ error: 'Missing setId/index' })

  try {
    const out = answerItem(setId, index, req.body || {})
    res.json(out)
  } catch (e: any) {
    res.status(400).json({ error: String(e?.message || e) })
  }
})
