// backend/api/player/reset.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCors } from '../../ops/_cors.js'
import { supabase } from '../../../db/client.js'

// (Opcional) lista de niveles válidos
const ALLOWED_LEVELS = ['junior', 'senior', 'master'] as const

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: { message: 'METHOD_NOT_ALLOWED' }
    })
  }

  const { userId, levelKey } = req.body ?? {}

  if (!userId) {
    return res.status(400).json({
      ok: false,
      error: { message: 'USER_ID_REQUIRED' }
    })
  }

  // Validar levelKey si viene (opcional, pero recomendado)
  if (levelKey && !ALLOWED_LEVELS.includes(levelKey)) {
    return res.status(400).json({
      ok: false,
      error: { message: 'LEVEL_KEY_INVALID' }
    })
  }

  // 1) Buscar sets del usuario (opcionalmente filtrados por nivel)
  let setsQuery = supabase
    .from('generated_set')
    .select('id')
    .eq('user_id', userId)

  if (levelKey) {
    setsQuery = setsQuery.eq('level_key', levelKey)
  }

  const { data: sets, error: setsErr } = await setsQuery
  if (setsErr) {
    return res.status(500).json({
      ok: false,
      error: { message: setsErr.message || 'ERROR_FETCHING_SETS' }
    })
  }

  const setIds = (sets ?? []).map(s => s.id)

  // 2) Borrar attempts / items / sets SOLO de esos sets
  if (setIds.length) {
    await supabase.from('attempt').delete().in('set_id', setIds)
    await supabase.from('generated_item').delete().in('set_id', setIds)
    await supabase.from('generated_set').delete().in('id', setIds)
  }

  // 3) Borrar player_state (opcionalmente solo del nivel)
  let psQuery = supabase
    .from('player_state')
    .delete()
    .eq('user_id', userId)

  if (levelKey) {
    psQuery = psQuery.eq('level_key', levelKey)
  }

  const { error: psErr } = await psQuery
  if (psErr) {
    return res.status(500).json({
      ok: false,
      error: { message: psErr.message || 'ERROR_DELETING_PLAYER_STATE' }
    })
  }

  // 4) Borrar cinematics vistos (si tu tabla tiene level_key, se filtra por nivel)
  let cineQuery = supabase
    .from('level_cinematic_seen')
    .delete()
    .eq('user_id', userId)

  // ⚠️ Si level_cinematic_seen NO tiene columna level_key, elimina este if.
  if (levelKey) {
    cineQuery = cineQuery.eq('level_key', levelKey)
  }

  const { error: cineErr } = await cineQuery
  if (cineErr) {
    return res.status(500).json({
      ok: false,
      error: { message: cineErr.message || 'ERROR_DELETING_CINEMATICS' }
    })
  }

  return res.json({
    ok: true,
    clearedSets: setIds.length,
    scope: levelKey ? 'level' : 'all'
  })
}

export default withCors(handler)
