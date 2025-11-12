// api/sets/[setId]/items/[index]/index.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../../../../../db/client.js'
import { withCors } from '../../../../../ops/_cors.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok:false, error:{ message:'METHOD_NOT_ALLOWED' } })
  }

  try {
    const { setId, index } = req.query
    if (!setId || typeof setId !== 'string') {
      return res.status(400).json({ ok:false, error:{ message:'SET_ID_REQUIRED' } })
    }
    const itemIndex = Number(index)
    if (!Number.isInteger(itemIndex) || itemIndex < 16 || itemIndex > 20) {
      // Esta ruta ahora es SOLO para BOSS (16..20)
      return res.status(400).json({ ok:false, error:{ message:'BOSS_INDEX_REQUIRED_16_20' } })
    }

    // Verifica que el item sea BOSS
    const { data: item, error: itemErr } = await supabase
      .from('generated_item')
      .select(`
        id, set_id, item_index, kind, question, options_json, answer_index, explanation, mentor_id,
        mentor:character!generated_item_mentor_id_fkey ( id, name, role )
      `)
      .eq('set_id', setId)
      .eq('item_index', itemIndex)
      .maybeSingle()

    if (itemErr) throw itemErr
    if (!item) return res.status(404).json({ ok:false, error:{ message:'ITEM_NOT_FOUND' } })
    if (item.kind !== 'boss') {
      return res.status(404).json({ ok:false, error:{ message:'NOT_A_BOSS_ITEM' } })
    }

    // Info del set
    const { data: gset, error: setErr } = await supabase
      .from('generated_set')
      .select('status, next_index, level_key, boss_unlocked')
      .eq('id', setId)
      .maybeSingle()

    if (setErr) throw setErr
    if (!gset) return res.status(404).json({ ok:false, error:{ message:'SET_NOT_FOUND' } })

    // Para boss exigimos que esté desbloqueado
    if (!gset.boss_unlocked) {
      return res.status(403).json({ ok:false, error:{ message:'BOSS_LOCKED' } })
    }

    // DTO
    const rawOptions = item.options_json as any
    const options: string[] = Array.isArray(rawOptions)
      ? rawOptions
      : (typeof rawOptions === 'string' ? JSON.parse(rawOptions) : [])

    const rawMentor = (item as any).mentor
    const mentorNode = rawMentor
      ? (Array.isArray(rawMentor) ? (rawMentor[0] ?? null) : rawMentor)
      : null

    return res.json({
      ok: true,
      setId,
      level: gset.level_key,
      index: item.item_index,
      kind: item.kind,          // 'boss'
      mentor: mentorNode ? { id: mentorNode.id, name: mentorNode.name, role: mentorNode.role } : null,
      question: item.question,
      options,
      status: gset.status,
      nextIndex: gset.next_index,
      total: 20
    })
  } catch (e:any) {
    return res.status(500).json({ ok:false, error:{ message: e.message || 'INTERNAL_ERROR' } })
  }
}
export default withCors(handler)
