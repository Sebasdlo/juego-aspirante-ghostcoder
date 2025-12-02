// api/Logica/player/state.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../ops/_cors.js'
import { supabase } from '../../../db/client.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: { message: 'METHOD_NOT_ALLOWED' } })
  }

  const userId = req.query.userId as string
  if (!userId) {
    return res.status(400).json({ ok: false, error: { message: 'USER_ID_REQUIRED' } })
  }

const levelKey = req.query.levelKey as string | undefined

// 1) Set ABIERTO
let openQuery = supabase
  .from('generated_set')
  .select('id, level_key, status, next_index, created_at')
  .eq('user_id', userId)
  .eq('status', 'open')

if (levelKey) {
  openQuery = openQuery.eq('level_key', levelKey)
}

const { data: openSet } = await openQuery
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()

// 2) Último COMPLETADO (filtrado por nivel si levelKey viene)
let lastCompletedQuery = supabase
  .from('generated_set')
  .select('id, level_key, status, next_index, created_at')
  .eq('user_id', userId)
  .eq('status', 'completed')

if (levelKey) {
  lastCompletedQuery = lastCompletedQuery.eq('level_key', levelKey)
}

const { data: lastCompletedSet } = await lastCompletedQuery
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()

// state.ts

// scores por nivel
let scoresQuery = supabase
  .from('player_state')
  .select('level_key, score')
  .eq('user_id', userId)

if (levelKey) {
  scoresQuery = scoresQuery.eq('level_key', levelKey)
}

const { data: scores } = await scoresQuery

  return res.json({
    ok: true,
    userId,
    openSet: openSet ?? null,
    lastCompletedSet: lastCompletedSet ?? null,
    scores: scores ?? []
  })
}

export default withCors(handler)
