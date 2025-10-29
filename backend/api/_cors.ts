// backend/api/_cors.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

export function withCors(
  handler: (req: VercelRequest, res: VercelResponse) => any | Promise<any>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    res.setHeader('Access-Control-Max-Age', '86400') // cache preflight 24h

    // Preflight
    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }

    // Handler real
    return handler(req, res)
  }
}
