import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../../../../../db/client.js'
import { withCors } from '../../../../../ops/_cors.js'

function normalizeName(n?: string) {
  // Permite nombres con tildes y espacios
  return (n ?? '').trim().toLowerCase()
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok:false, error:{ message:'METHOD_NOT_ALLOWED' } })
  }

  const { setId, mentorName } = req.query as { setId?: string; mentorName?: string }
  const { userId, mode } = req.query as { userId?: string; mode?: string }

  if (!setId || typeof setId !== 'string') {
    return res.status(400).json({ ok:false, error:{ message:'SET_ID_REQUIRED' } })
  }
  if (!mentorName || typeof mentorName !== 'string') {
    return res.status(400).json({ ok:false, error:{ message:'MENTOR_NAME_REQUIRED' } })
  }

  // 1) Resolver mentor por nombre (case-insensitive)
  const { data: mentorRow, error: mentorErr } = await supabase
    .from('character')
    .select('id, name, role')
    .eq('is_mentor', true)
    .ilike('name', normalizeName(mentorName).replace(/%/g,'\\%'))
    .maybeSingle()

  if (mentorErr) {
    return res.status(500).json({ ok:false, error:{ message:'MENTOR_QUERY_FAILED', detail: mentorErr.message } })
  }
  if (!mentorRow) {
    return res.status(404).json({ ok:false, error:{ message:'MENTOR_NOT_FOUND' } })
  }

  // 2) Traer los 3 items (main, main, random) de ese mentor dentro del set
  const { data: items, error: itemsErr } = await supabase
    .from('generated_item')
    .select('item_index, kind, question, options_json, mentor_id')
    .eq('set_id', setId)
    .eq('mentor_id', mentorRow.id)
    .in('kind', ['main','random'])
    .order('item_index', { ascending: true })

  if (itemsErr) {
    return res.status(500).json({ ok:false, error:{ message:'ITEMS_QUERY_FAILED', detail: itemsErr.message } })
  }
  if (!items || items.length === 0) {
    return res.json({ ok:true, mentor: mentorRow, items: [] })
  }

  // Si no hay modo, devuelve el listado simple (como ya lo tenías)
  if (!mode) {
    return res.json({
      ok: true,
      mentor: mentorRow,
      items: items.map(i => ({ item_index: i.item_index, kind: i.kind }))
    })
  }

  // 3) Modo secuencial: devolver SOLO el siguiente pendiente del mentor
  if (mode === 'next') {
    if (!userId) {
      return res.status(400).json({ ok:false, error:{ message:'USER_ID_REQUIRED' } })
    }

    // a) saber next_index global del set (para respetar el orden general)
    const { data: gset, error: gErr } = await supabase
      .from('generated_set')
      .select('status, next_index, level_key')
      .eq('id', setId)
      .maybeSingle()

    if (gErr || !gset) {
      return res.status(404).json({ ok:false, error:{ message:'SET_NOT_FOUND' } })
    }
    if (gset.status !== 'open') {
      return res.status(400).json({ ok:false, error:{ message:'SET_NOT_OPEN' } })
    }

    const mentorIndexes = items.map(i => i.item_index)

    // b) Intentos del usuario en esos 3
    const { data: attempts, error: attErr } = await supabase
      .from('attempt')
      .select('item_index')
      .eq('set_id', setId)
      .eq('user_id', userId)
      .in('item_index', mentorIndexes)

    if (attErr) {
      return res.status(500).json({ ok:false, error:{ message:'ATTEMPTS_QUERY_FAILED', detail: attErr.message } })
    }

    const answered = new Set((attempts ?? []).map(a => a.item_index))

    // c) “Siguiente” del mentor = primer índice del mentor que:
    //    - sea >= next_index global del set, y
    //    - no esté respondido todavía
    const nextForMentor = mentorIndexes.find(ix => ix >= (gset.next_index ?? 1) && !answered.has(ix))
                      ?? mentorIndexes.find(ix => !answered.has(ix)) // fallback por si el global apunta a otro mentor

    if (!nextForMentor) {
      // Ya respondió los 3 de este mentor
      return res.json({
        ok: true,
        finishedForMentor: true,
        mentor: mentorRow
      })
    }

    // d) Cargar el DTO completo del ítem elegido
    const itemFull = items.find(i => i.item_index === nextForMentor)!
    const rawOptions = itemFull.options_json as any
    const options: string[] = Array.isArray(rawOptions)
      ? rawOptions
      : (typeof rawOptions === 'string' ? JSON.parse(rawOptions) : [])

    return res.json({
      ok: true,
      setId,
      level: gset.level_key,
      index: itemFull.item_index,
      kind: itemFull.kind,
      mentor: { id: mentorRow.id, name: mentorRow.name, role: mentorRow.role },
      question: itemFull.question,
      options,
      status: gset.status,
      nextIndex: gset.next_index,
      total: 20
    })
  }

  return res.status(400).json({ ok:false, error:{ message:'INVALID_MODE' } })
}

export default withCors(handler)
