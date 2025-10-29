// backend/api/levels/[level]/start.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../_cors.js'
import { startLevel } from '../../../core/game/engine.js'

export default withCors(function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { level } = req.query
  const { userId } = (req.body as any) || {}

  if (!level || !userId) return res.status(400).json({ error: 'Missing level/userId' })

  const s = startLevel(String(userId), String(level))
  return res.status(200).json({
    setId: s.setId,
    level: s.level,
    nextIndex: s.nextIndex,
    score: s.score
  })
})
