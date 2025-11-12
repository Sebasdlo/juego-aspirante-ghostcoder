import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../../../db/client.js'
import { randomUUID } from 'node:crypto'
import { withCors } from '../../../ops/_cors.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok:false, error:{ message:'METHOD_NOT_ALLOWED' } })
  }

  try {
    const { level } = req.query
    const { userId } = req.body ?? {}

    if (!level || typeof level !== 'string') {
      return res.status(400).json({ ok:false, error:{ message:'LEVEL_REQUIRED' } })
    }
    if (!userId) {
      return res.status(400).json({ ok:false, error:{ message:'USER_ID_REQUIRED' } })
    }

    // 1) Reusar set abierto si existe
    const { data: existing } = await supabase
      .from('generated_set')
      .select('id, next_index')
      .eq('user_id', userId)
      .eq('level_key', level)
      .eq('status','open')
      .maybeSingle()

    if (existing) {
      return res.json({
        ok:true,
        setId: existing.id,
        level,
        items: 20,
        status:'open',
        nextIndex: existing.next_index
      })
    }

    // 2) Obtener mentores del nivel
    const { data: mentors, error: mentorsErr } = await supabase
      .from('level_character')
      .select('character:character!inner(id, name, is_mentor)')
      .eq('level_key', level)

    if (mentorsErr) throw mentorsErr

    const mentorIds = mentors
      ?.map(r => r.character)
      ?.filter((c:any) => c?.is_mentor)
      ?.map((c:any) => c.id)

    if (!mentorIds || mentorIds.length !== 5) {
      return res.status(400).json({ ok:false, error:{ message:'MENTOR_COUNT_INVALID' } })
    }

    // 3) Crear set
    const setId = randomUUID()

    const { error: setErr } = await supabase
      .from('generated_set')
      .insert({
        id: setId,
        user_id: userId,
        level_key: level,
        provider: 'mock',
        prompt_version: 1,
        status: 'open',
        next_index: 1
      })
    if (setErr) throw setErr

    // 4) Crear ítems
    const items:any[] = []
    let index = 1

    const make = (kind:'main'|'random'|'boss', mentorId?:string) => ({
      id: randomUUID(),
      set_id: setId,
      item_index: index++,
      kind,
      question: `(${kind.toUpperCase()}) Reto ${index-1}`,
      options_json: JSON.stringify(["Opción A","Opción B","Opción C","Opción D"]),
      answer_index: 1,
      explanation: `Explicación del reto ${index-1}`,
      mentor_id: mentorId ?? null
    })

    // Por cada mentor → 2 main + 1 random
    mentorIds.forEach(mId => {
      items.push(make('main', mId))
      items.push(make('main', mId))
      items.push(make('random', mId))
    })

    // 5 boss sin mentor
    for (let i=0;i<5;i++) items.push(make('boss'))

    // Guardar ítems
    const { error: itemsErr } = await supabase.from('generated_item').insert(items)
    if (itemsErr) throw itemsErr

    // Crear/Actualizar estado del jugador
    await supabase
      .from('player_state')
      .upsert({
        user_id: userId,
        level_key: level,
        current_set_id: setId,
        next_index: 1
      }, { onConflict: 'user_id,level_key' })

    return res.json({
      ok:true,
      setId,
      level,
      items: items.length,
      status:'open',
      nextIndex: 1
    })

  } catch (e:any) {
    return res.status(500).json({ ok:false, error:{ message: e.message || 'INTERNAL_ERROR' } })
  }
}
export default withCors(handler)