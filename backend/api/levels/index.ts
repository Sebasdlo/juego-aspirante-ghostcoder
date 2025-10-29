// backend/api/levels/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../_cors.js'
import { LEVELS } from '../../config/constants.js'

export default withCors(function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ levels: LEVELS })
})
