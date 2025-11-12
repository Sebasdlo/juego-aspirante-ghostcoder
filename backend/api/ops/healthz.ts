// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from './_cors.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    ok: true,
    service: 'ghostcoder-backend',
    ts: new Date().toISOString(),
  })
}

export default withCors(handler)
