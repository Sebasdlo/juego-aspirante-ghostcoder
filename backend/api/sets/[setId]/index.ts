import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../_cors.js'
import { getItem } from '../../../core/game/engine.js'

export default withCors(function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const setId = String(req.query.setId || '')
  const index = String(req.query.index ?? '1')
  if (!setId) return res.status(400).json({ error: 'Missing setId' })

  const item = getItem(setId, index)
  if (!item) return res.status(404).json({ error: 'Item not found' })
  res.json(item)
})
