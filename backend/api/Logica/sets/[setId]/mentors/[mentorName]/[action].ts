import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../../../../../db/client.js'
import { withCors } from '../../../../../ops/_cors.js'

function normalizeName(n?: string) {
  // Permite nombres con tildes y espacios
  return (n ?? '').trim().toLowerCase()
}

async function getMentorItems(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: { message: 'METHOD_NOT_ALLOWED' } })
  }

  const { setId, mentorName } = req.query as { setId?: string; mentorName?: string }
  const { userId, mode } = req.query as { userId?: string; mode?: string }

  if (!setId || typeof setId !== 'string') {
    return res.status(400).json({ ok: false, error: { message: 'SET_ID_REQUIRED' } })
  }
  if (!mentorName || typeof mentorName !== 'string') {
    return res.status(400).json({ ok: false, error: { message: 'MENTOR_NAME_REQUIRED' } })
  }

  // 1) Resolver mentor por nombre (case-insensitive)
  const { data: mentorRow, error: mentorErr } = await supabase
    .from('character')
    .select('id, name, role')
    .eq('is_mentor', true)
    .ilike('name', normalizeName(mentorName).replace(/%/g, '\\%'))
    .maybeSingle()

  if (mentorErr) {
    return res.status(500).json({
      ok: false,
      error: { message: 'MENTOR_QUERY_FAILED', detail: mentorErr.message }
    })
  }
  if (!mentorRow) {
    return res.status(404).json({ ok: false, error: { message: 'MENTOR_NOT_FOUND' } })
  }

  // 2) Traer los 3 items (main, main, random) de ese mentor dentro del set
  const { data: items, error: itemsErr } = await supabase
    .from('generated_item')
    .select('item_index, kind, question, options_json, mentor_id')
    .eq('set_id', setId)
    .eq('mentor_id', mentorRow.id)
    .in('kind', ['main', 'random'])
    .order('item_index', { ascending: true })

  if (itemsErr) {
    return res.status(500).json({
      ok: false,
      error: { message: 'ITEMS_QUERY_FAILED', detail: itemsErr.message }
    })
  }
  if (!items || items.length === 0) {
    return res.json({ ok: true, mentor: mentorRow, items: [] })
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
      return res.status(400).json({ ok: false, error: { message: 'USER_ID_REQUIRED' } })
    }

    // a) saber next_index global del set (para respetar el orden general)
    const { data: gset, error: gErr } = await supabase
      .from('generated_set')
      .select('status, next_index, level_key')
      .eq('id', setId)
      .maybeSingle()

    if (gErr || !gset) {
      return res.status(404).json({ ok: false, error: { message: 'SET_NOT_FOUND' } })
    }
    if (gset.status !== 'open') {
      return res.status(400).json({ ok: false, error: { message: 'SET_NOT_OPEN' } })
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
      return res.status(500).json({
        ok: false,
        error: { message: 'ATTEMPTS_QUERY_FAILED', detail: attErr.message }
      })
    }

    const answered = new Set((attempts ?? []).map(a => a.item_index))

    // 👉 Pendientes de este mentor
    const remaining = mentorIndexes.filter(ix => !answered.has(ix))

    // 👉 Si solo queda 1 pendiente y es RANDOM, aquí metemos la probabilidad
    if (remaining.length === 1) {
      const lastIndex = remaining[0]
      const lastItem = items.find(i => i.item_index === lastIndex)

      if (lastItem && lastItem.kind === 'random') {
        const RANDOM_PROB = 0.5 // 50% de que aparezca el random (ajusta si quieres)

        const roll = Math.random()
        // 🧠 Si el dado "falla", consideramos que el mentor terminó SIN mostrar el random
        if (roll >= RANDOM_PROB) {
          return res.json({
            ok: true,
            finishedForMentor: true,
            mentor: mentorRow
          })
        }
        // Si el dado "acierta", seguimos y devolvemos este random normalmente 👇
      }
    }

    // 👉 Lógica normal: siguiente ítem del mentor, respetando next_index global
    const nextForMentor =
      mentorIndexes.find(ix => ix >= (gset.next_index ?? 1) && !answered.has(ix)) ??
      mentorIndexes.find(ix => !answered.has(ix)) // fallback por si el global apunta a otro mentor

    if (!nextForMentor) {
      // Ya respondió (o descartamos) todos los de este mentor
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

  return res.status(400).json({ ok: false, error: { message: 'INVALID_MODE' } })
}

function isUuid(v: any) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

async function  answerMentorItem(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok:false, error:{ message:'METHOD_NOT_ALLOWED' } })
  }

  const { setId, mentorName } = req.query as { setId?: string; mentorName?: string }
  const { userId, answer, index } = req.body ?? {}

  if (!setId || typeof setId !== 'string') {
    return res.status(400).json({ ok:false, error:{ message:'SET_ID_REQUIRED' } })
  }
  if (!mentorName || typeof mentorName !== 'string') {
    return res.status(400).json({ ok:false, error:{ message:'MENTOR_NAME_REQUIRED' } })
  }
  if (!userId) {
    return res.status(400).json({ ok:false, error:{ message:'USER_ID_REQUIRED' } })
  }
  if (!isUuid(userId)) {
    return res.status(400).json({ ok:false, error:{ message:'USER_ID_INVALID_UUID' } })
  }
  if (answer == null) {
    return res.status(400).json({ ok:false, error:{ message:'ANSWER_REQUIRED' } })
  }

  // 1) Set y estado
  const { data: gset } = await supabase
    .from('generated_set')
    .select('id, user_id, level_key, status, next_index')
    .eq('id', setId)
    .maybeSingle()

  if (!gset) return res.status(404).json({ ok:false, error:{ message:'SET_NOT_FOUND' } })
  if (gset.status !== 'open') return res.status(400).json({ ok:false, error:{ message:'SET_NOT_OPEN' } })
  if (gset.user_id !== userId) return res.status(403).json({ ok:false, error:{ message:'USER_SET_MISMATCH' } })

  // 2) Mentor
  const { data: mentorRow } = await supabase
    .from('character')
    .select('id, name, role')
    .eq('is_mentor', true)
    .ilike('name', mentorName.trim().toLowerCase())
    .maybeSingle()

  if (!mentorRow) return res.status(404).json({ ok:false, error:{ message:'MENTOR_NOT_FOUND' } })

  // 3) Ítems del mentor en el set (incluye explanation)
  const { data: items } = await supabase
    .from('generated_item')
    .select('item_index, kind, answer_index, explanation')
    .eq('set_id', setId)
    .eq('mentor_id', mentorRow.id)
    .in('kind', ['main','random'])
    .order('item_index', { ascending: true })

  if (!items || !items.length) {
    return res.status(404).json({ ok:false, error:{ message:'MENTOR_ITEMS_NOT_FOUND' } })
  }

  // 4) ¿Cuál index responder?
  let itemIndex: number | undefined = Number.isInteger(index) ? Number(index) : undefined
  if (!itemIndex) {
    const mentorIndexes = items.map(i => i.item_index)
    const { data: attempts } = await supabase
      .from('attempt')
      .select('item_index')
      .eq('set_id', setId)
      .eq('user_id', userId)
      .in('item_index', mentorIndexes)

    const answered = new Set((attempts ?? []).map(a => a.item_index))
    itemIndex = mentorIndexes.find(ix => ix >= (gset.next_index ?? 1) && !answered.has(ix))
             ?? mentorIndexes.find(ix => !answered.has(ix))
  }

  if (!itemIndex) {
    // Ya terminó los 3 de este mentor
    return res.json({ ok:true, finishedForMentor: true })
  }
  
  const target = items.find(i => i.item_index === itemIndex)
  if (!target) return res.status(404).json({ ok:false, error:{ message:'ITEM_NOT_FOUND' } })

  // 5) Impedir doble respuesta
  const { data: prev } = await supabase
    .from('attempt')
    .select('id')
    .eq('set_id', setId)
    .eq('user_id', userId)
    .eq('item_index', itemIndex)
    .maybeSingle()

  if (prev) return res.status(409).json({ ok:false, error:{ message:'ALREADY_ANSWERED' } })

  const isCorrect = Number(answer) === target.answer_index

  // 6) Insertar intento
  const { error: insErr } = await supabase
    .from('attempt')
    .insert({
      set_id: setId,
      user_id: userId,
      item_index: itemIndex,
      answer_given: Number(answer),
      is_correct: isCorrect
    })

  if (insErr) {
    return res.status(500).json({ ok:false, error:{ message:'ATTEMPT_INSERT_FAILED', detail: insErr.message } })
  }

  // 7) Score + avanzar next_index global
  if (isCorrect) {
    const { data: curPs } = await supabase
      .from('player_state')
      .select('score')
      .eq('user_id', userId)
      .eq('level_key', gset.level_key)
      .maybeSingle()

    await supabase
      .from('player_state')
      .update({ score: (curPs?.score ?? 0) + 1 })
      .eq('user_id', userId)
      .eq('level_key', gset.level_key)
  }

  const nextIndex = Math.min(20, (gset.next_index ?? 1) + 1)
  await supabase
    .from('generated_set')
    .update({ next_index: nextIndex })
    .eq('id', setId)

  // 8) ¿Quedan preguntas de este mentor?
  const mentorIndexes = items.map(i => i.item_index)
  const { data: attempts2 } = await supabase
    .from('attempt')
    .select('item_index')
    .eq('set_id', setId)
    .eq('user_id', userId)
    .in('item_index', mentorIndexes)

  const answered2 = new Set((attempts2 ?? []).map(a => a.item_index))
  const remaining = mentorIndexes.filter(ix => !answered2.has(ix))

  // explicación solo si fue correcta
  const explanation = isCorrect ? target.explanation : undefined

  return res.json({
    ok: true,
    correct: isCorrect,
    explanation,                 // aparece solo cuando la respuesta es correcta
    finishedForMentor: remaining.length === 0,
    nextIndexGlobal: nextIndex,
    remainingForMentor: remaining
  })
}


async function mainHandler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query as { action?: string }

  if (req.method === 'GET' && (!action || action === 'items')) {
    return getMentorItems(req, res)
  }

  if (req.method === 'POST' && action === 'answer') {
    return answerMentorItem(req, res)
  }

  return res.status(404).json({ ok: false, error: { message: 'NOT_FOUND' } })
}

export default withCors(mainHandler)