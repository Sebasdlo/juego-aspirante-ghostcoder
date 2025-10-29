import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../_cors.js'
import { getProgress, resetProgress } from '../../core/game/engine.js'

export default withCors(function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const userId = String(req.query.userId ?? 'anon')
    const p = getProgress(userId)
    return res.json(p)
  }

  if (req.method === 'DELETE') {
    const userId = String(req.query.userId ?? 'anon')
    resetProgress(userId)
    return res.json({ ok: true, msg: `Progreso de ${userId} eliminado` })
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
