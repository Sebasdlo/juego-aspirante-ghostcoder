// backend/api/Narrativa/levels/[level]/start.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'

import { supabase } from '../../../../db/client.js'
import { withCors } from '../../../ops/_cors.js'
import { generateItemsForLevel } from '../../../Gestion_prompts/GeneradorSets.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ ok: false, error: { message: 'METHOD_NOT_ALLOWED' } })
  }

  try {
    const { level } = req.query
    const { userId } = req.body ?? {}

    if (!level || typeof level !== 'string') {
      return res
        .status(400)
        .json({ ok: false, error: { message: 'LEVEL_REQUIRED' } })
    }
    if (!userId) {
      return res
        .status(400)
        .json({ ok: false, error: { message: 'USER_ID_REQUIRED' } })
    }

    // 1) Intentar reutilizar un set "open" SOLO si ya tiene sus 20 ítems
    const { data: existing, error: existingErr } = await supabase
      .from('generated_set')
      .select('id, next_index')
      .eq('user_id', userId)
      .eq('level_key', level)
      .eq('status', 'open')
      .maybeSingle()

    if (existingErr) throw existingErr

    if (existing) {
      // Verificamos si realmente tiene 20 ítems asociados
      const { count, error: countErr } = await supabase
        .from('generated_item')
        .select('id', { count: 'exact', head: true })
        .eq('set_id', existing.id)

      if (countErr) throw countErr

      if (typeof count === 'number' && count === 20) {
        // Set válido → se reutiliza
        return res.json({
          ok: true,
          setId: existing.id,
          level,
          items: 20,
          status: 'open',
          nextIndex: existing.next_index
        })
      } else {
        // Set "dañado" (sin ítems o incompleto) → lo marcamos cerrado
        await supabase
          .from('generated_set')
          .update({ status: 'invalid' })
          .eq('id', existing.id)
      }
    }

    // 2) Generar los 20 retos vía IA (start SIEMPRE exige exactamente 20)
    const iaItems = await generateItemsForLevel(level)

    // 3) Obtener mentores del nivel para mapear mentorName → mentor_id
    const { data: mentors, error: mentorsErr } = await supabase
      .from('level_character')
      .select('character:character!inner(id, name, is_mentor)')
      .eq('level_key', level)

    if (mentorsErr) throw mentorsErr

    const mentorMap: Record<string, string> = {}
    ;(mentors ?? [])
      .map((r: any) => r.character)
      .filter((c: any) => c?.is_mentor)
      .forEach((c: any) => {
        mentorMap[c.name] = c.id
      })

    // 4) Crear el SET (todavía no cerramos nada)
    const setId = randomUUID()

    const { error: setErr } = await supabase.from('generated_set').insert({
      id: setId,
      user_id: userId,
      level_key: level,
      provider: 'openai',
      prompt_version: 1, // si luego manejas versiones reales, se puede leer de prompt_template
      status: 'open',
      next_index: 1
    })
    if (setErr) throw setErr

    // 5) Transformar los IAItem → filas de generated_item
    const itemsToInsert = iaItems.map((item, idx) => {
      let mentorId: string | null = null

      if (item.kind !== 'boss') {
        const nameKey = item.mentorName ?? ''
        mentorId = mentorMap[nameKey] ?? null

        if (!mentorId) {
          throw new Error(
            `No se encontró mentor_id en BD para mentorName="${nameKey}"`
          )
        }
      }

      return {
        id: randomUUID(),
        set_id: setId,
        item_index: idx + 1, // 1..20
        kind: item.kind,
        question: item.question,
        options_json: JSON.stringify(item.options),
        answer_index: item.answer_index,
        explanation: item.explanation,
        mentor_id: mentorId
      }
    })

    const { error: itemsErr } = await supabase
      .from('generated_item')
      .insert(itemsToInsert)

    if (itemsErr) throw itemsErr

    // 6) Crear/Actualizar estado del jugador
    await supabase
      .from('player_state')
      .upsert(
        {
          user_id: userId,
          level_key: level,
          current_set_id: setId,
          next_index: 1
        },
        { onConflict: 'user_id,level_key' }
      )

    // 7) Respuesta OK
    return res.json({
      ok: true,
      setId,
      level,
      items: iaItems.length,
      status: 'open',
      nextIndex: 1
    })
  } catch (e: any) {
    console.error('Error en /levels/start:', e)
    return res.status(500).json({
      ok: false,
      error: { message: e?.message || 'INTERNAL_ERROR' }
    })
  }
}

export default withCors(handler)
