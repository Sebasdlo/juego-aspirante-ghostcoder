// backend/api/levels/[level]/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../_cors.js'           // 👈 OJO a la ruta y el .js
import { getLevelIntro } from '../../../core/narrative/narrative.service.js'
// Si no tienes narrative.service, responde un texto base:
// import { withCors } from '../../../_cors.js'

export default withCors(function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const level = String(req.query.level || '').toLowerCase()
  if (!level) return res.status(400).json({ error: 'Missing level' })

  // Si tienes un servicio de narrativa:
  try {
    const intro = typeof getLevelIntro === 'function'
      ? getLevelIntro(level)
      : { intro: `Introducción del nivel ${level}.` }

    return res.status(200).json(intro)
  } catch {
    // Fallback simple si no hay servicio implementado
    return res.status(200).json({ intro: `Introducción del nivel ${level}.` })
  }
})
