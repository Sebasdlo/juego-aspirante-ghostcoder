import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../_cors.js'

export default withCors(function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, service: 'backend', ts: Date.now() })
})
