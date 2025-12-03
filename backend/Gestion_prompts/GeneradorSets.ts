// backend/Gestion_promts/GeneradorSets.ts 
import { supabase } from '../db/client.js'

// MentorName ahora es genérico: cada nivel tendrá sus mentores propios
export type MentorName = string | null

export type IAItem = {
  question: string
  options: string[]
  answer_index: number
  explanation: string
  kind: 'main' | 'random' | 'boss'
  mentorName: MentorName
}

type PromptTemplateRow = {
  level_key: string
  version: number
  template_text: string
  constraints_json: any | null
}

function cleanModelContent(raw: string | null | undefined): string {
  if (!raw) return '[]'

  let text = raw.trim()

  // Quitar fences ```json ... ``` o ``` ... ```
  if (text.startsWith('```')) {
    const lines = text.split('\n')
    if (lines[0].startsWith('```')) lines.shift()
    if (lines.length && lines[lines.length - 1].startsWith('```')) lines.pop()
    text = lines.join('\n').trim()
  }

  // Quedarnos solo con el PRIMER array que aparezca
  const firstBracket = text.indexOf('[')
  const lastBracket = text.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    text = text.slice(firstBracket, lastBracket + 1).trim()
  }

  // Normalizar saltos de línea y tabs → espacios (todo en una sola línea)
  text = text.replace(/\r\n/g, '\n')
  text = text.replace(/\r/g, '\n')
  text = text.replace(/\n/g, ' ')
  text = text.replace(/\t/g, ' ')

  // Compactar espacios múltiples
  text = text.replace(/\s{2,}/g, ' ')

  return text
}

/**
 * Intenta parsear JSON de forma tolerante:
 * - Primer intento: JSON.parse normal
 * - Segundo intento: elimina comas colgantes antes de } o ] y vuelve a intentar
 */
function safeParseJson(cleaned: string): any {
  try {
    return JSON.parse(cleaned)
  } catch (e1: any) {
    const fixed = cleaned.replace(/,\s*([\]}])/g, '$1')
    try {
      return JSON.parse(fixed)
    } catch (e2: any) {
      throw new Error(
        `No se pudo parsear el JSON devuelto por la IA: ${e1?.message || 'Error de parseo'}`
      )
    }
  }
}

/**
 * Obtiene la lista de mentores válidos para un levelKey desde Supabase.
 * NO usamos una lista quemada — cada nivel tiene sus propios mentores.
 */
async function loadAllowedMentors(levelKey: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('level_character')
    .select('character:character!inner(name, is_mentor)')
    .eq('level_key', levelKey)

  if (error) {
    throw new Error(
      `Error cargando mentores para nivel "${levelKey}": ${error.message}`
    )
  }

  const mentors = (data ?? [])
    .map((r: any) => r.character)
    .filter((c: any) => c?.is_mentor)
    .map((c: any) => c.name)

  if (!mentors.length) {
    throw new Error(
      `No se encontraron mentores válidos para el nivel "${levelKey}"`
    )
  }

  return mentors
}

async function validateAndNormalizeItems(
  levelKey: string,
  data: any
): Promise<IAItem[]> {
  if (!Array.isArray(data)) {
    throw new Error('La respuesta de la IA debe ser un arreglo JSON de objetos')
  }

  // 🔒 No aceptamos menos de 20 en ningún caso
  if (data.length < 20) {
    throw new Error(
      `Se esperaban al menos 20 retos, pero llegaron ${data.length}`
    )
  }

  // Mentores válidos para ESTE nivel (según BD)
  const allowedMentors = await loadAllowedMentors(levelKey)

  // 1) Normalizamos TODOS los ítems que llegaron (21, 25, 30... lo que sea)
  type WithIndex = { idx: number; item: IAItem }

  const normalized: WithIndex[] = data.map((raw, idx) => {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`El reto ${idx + 1} no es un objeto válido`)
    }

    const {
      question,
      options,
      answer_index,
      explanation,
      kind,
      mentorName
    } = raw

    if (typeof question !== 'string' || !question.trim()) {
      throw new Error(`El reto ${idx + 1} tiene una "question" inválida`)
    }

    if (!Array.isArray(options) || options.length !== 4) {
      throw new Error(
        `El reto ${idx + 1} debe tener "options" como arreglo de 4 strings`
      )
    }

    options.forEach((opt, i) => {
      if (typeof opt !== 'string' || !opt.trim()) {
        throw new Error(
          `El reto ${idx + 1} tiene una opción inválida en posición ${i + 1}`
        )
      }
    })

    const ansIdx = Number(answer_index)
    if (!Number.isInteger(ansIdx) || ansIdx < 1 || ansIdx > 4) {
      throw new Error(
        `El reto ${idx + 1} tiene "answer_index" inválido (debe ser 1..4)`
      )
    }

    if (typeof explanation !== 'string' || !explanation.trim()) {
      throw new Error(`El reto ${idx + 1} tiene "explanation" inválida`)
    }

    if (!['main', 'random', 'boss'].includes(kind)) {
      throw new Error(
        `El reto ${idx + 1} tiene "kind" inválido (solo main|random|boss)`
      )
    }

    let normMentor: MentorName = null

    if (kind === 'boss') {
      // Para boss, esperamos mentorName null
      if (mentorName !== null) {
        throw new Error(
          `El reto ${idx + 1} es "boss" y debe tener "mentorName": null`
        )
      }
      normMentor = null
    } else {
      // main / random deben tener mentorName válido para ESTE nivel
      if (typeof mentorName !== 'string' || !allowedMentors.includes(mentorName)) {
        throw new Error(
          `El reto ${idx + 1} tiene "mentorName" inválido para el nivel "${levelKey}": ${String(
            mentorName
          )}`
        )
      }
      normMentor = mentorName as string
    }

    const item: IAItem = {
      question: question.trim(),
      options: options.map((o: string) => o.trim()),
      answer_index: ansIdx,
      explanation: explanation.trim(),
      kind,
      mentorName: normMentor
    }

    return { idx, item }
  })

  // -------------------------------------------------------
  // 🔥 LÓGICA ESPECIAL PARA TODOS LOS NIVELES
  // -------------------------------------------------------

  // 2) Seleccionar exactamente 5 BOSS desde TODOS los ítems
  const bossesAll = normalized.filter(n => n.item.kind === 'boss')

  if (bossesAll.length < 5) {
    throw new Error(
      `Para el nivel "${levelKey}" se esperan 5 retos "boss" y llegaron ${bossesAll.length}`
    )
  }

  const selectedBosses = bossesAll.slice(0, 5)

  // 3) Para cada mentor: elegir 2 main + 1 random desde TODOS los ítems
  const selectedMentorItems: WithIndex[] = []

  for (const mentor of allowedMentors) {
    const mine = normalized.filter(
      n =>
        n.item.mentorName === mentor &&
        (n.item.kind === 'main' || n.item.kind === 'random')
    )

    const mains = mine.filter(n => n.item.kind === 'main')
    const randoms = mine.filter(n => n.item.kind === 'random')

    if (mains.length < 2 || randoms.length < 1) {
      throw new Error(
        `Para el mentor "${mentor}" en el nivel "${levelKey}" se requieren al menos 2 main + 1 random, ` +
          `pero se encontraron main=${mains.length}, random=${randoms.length}`
      )
    }

    // Tomamos SIEMPRE los primeros que aparezcan
    selectedMentorItems.push(mains[0], mains[1], randoms[0])
  }

  // 4) Unimos: 5 boss + (mentores × 3 retos)
  const combined: WithIndex[] = [...selectedBosses, ...selectedMentorItems]

  const expectedTotal = 5 + allowedMentors.length * 3
  if (combined.length !== expectedTotal) {
    throw new Error(
      `Error interno al reconstruir los retos para "${levelKey}": ` +
        `se esperaban ${expectedTotal} y quedaron ${combined.length}`
    )
  }

  if (expectedTotal !== 20) {
    console.warn(
      `Advertencia: la distribución para "${levelKey}" no suma 20 retos (esperados 20, calculados ${expectedTotal}). ` +
        'Revisa el número de mentores configurados en level_character.'
    )
  }

  // 5) Validación extra (por si acaso): distribución final
  const finalItems = combined
    .sort((a, b) => a.idx - b.idx) // opcional: respetar el orden original aproximado
    .map(n => n.item)

  const countMain = finalItems.filter(i => i.kind === 'main').length
  const countRandom = finalItems.filter(i => i.kind === 'random').length
  const countBoss = finalItems.filter(i => i.kind === 'boss').length

  if (countMain !== 10 || countRandom !== 5 || countBoss !== 5) {
    throw new Error(
      `Distribución inválida tras reconstrucción para "${levelKey}": ` +
        `main=${countMain}, random=${countRandom}, boss=${countBoss} (deben ser 10, 5, 5)`
    )
  }

  for (const mentor of allowedMentors) {
    const mine = finalItems.filter(i => i.mentorName === mentor)
    const mains = mine.filter(i => i.kind === 'main').length
    const randoms = mine.filter(i => i.kind === 'random').length

    if (mains !== 2 || randoms !== 1) {
      throw new Error(
        `Distribución incorrecta para "${mentor}" en "${levelKey}" tras reconstrucción: ` +
          `main=${mains}, random=${randoms} (deben ser 2 main + 1 random)`
      )
    }
  }

  return finalItems
}

/**
 * Carga el prompt_template desde Supabase para un level dado.
 */
async function loadPromptTemplate(levelKey: string): Promise<PromptTemplateRow> {
  const { data, error } = await supabase
    .from('prompt_template')
    .select('level_key, version, template_text, constraints_json')
    .eq('level_key', levelKey)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Error consultando prompt_template: ${error.message}`)
  }

  if (!data) {
    throw new Error(
      `No se encontró prompt_template para level_key="${levelKey}"`
    )
  }

  return data as PromptTemplateRow
}

// Reduce tokens sin cambiar tu narrativa
function shrinkPrompt(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/(Recuerda que|Asegúrate de que|Ten en cuenta que)/gi, '')
    .slice(0, 15000)
    .trim()
}

/**
 * Llama al modelo de OpenAI para generar el array de 20 retos
 * según el prompt_template guardado en Supabase.
 */
export async function generateItemsForLevel(
  levelKey: string,
  model = 'gpt-4.1-mini',
  maxAttempts = 3
): Promise<IAItem[]> {
  // 🔑 Validar API key DENTRO de la función (no en top-level)
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está definido en las variables de entorno')
  }

  // 1) Cargar el template desde la BD (solo una vez)
  const tpl = await loadPromptTemplate(levelKey)

  const systemMessage =
    'Eres un generador estricto de retos de selección múltiple. Tu única salida debe ser un JSON válido, sin texto adicional ni comentarios.'

  const constraintHints =
    tpl.constraints_json && typeof tpl.constraints_json === 'object'
      ? `\n\nRestricciones adicionales (usa solo como guía, no como clave JSON): ${JSON.stringify(
          tpl.constraints_json
        )}`
      : ''

  // 👉 Aquí dentro ya está TODO el texto del prompt del nivel (template_text)
  const userMessage = shrinkPrompt(`${tpl.template_text}${constraintHints}`)

  let lastError: Error | null = null

  // 🔁 Intentamos varias veces hasta obtener un set válido
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const completionRes = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            temperature: 0.4,
            max_tokens: 3000,
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: userMessage }
            ]
          })
        }
      )

      if (!completionRes.ok) {
        const errText = await completionRes.text().catch(() => '')
        throw new Error(
          `Error desde OpenAI (${completionRes.status}): ${
            errText || completionRes.statusText
          }`
        )
      }

      const completionJson: any = await completionRes.json()
      const rawContent = completionJson?.choices?.[0]?.message?.content
      const cleaned = cleanModelContent(rawContent)

      const parsed = safeParseJson(cleaned)

      // 🔒 Aquí se valida TODO (estructura + rebalanceo junior cuando aplica)
      const items = await validateAndNormalizeItems(levelKey, parsed)

      // ✅ Si llegamos aquí, el set es válido → lo devolvemos
      return items
    } catch (e: any) {
      lastError = e instanceof Error ? e : new Error(String(e))
      console.error(
        `Intento ${attempt} fallido al generar retos para "${levelKey}":`,
        lastError.message
      )

      // Si no es el último intento, seguimos al siguiente loop
      if (attempt < maxAttempts) {
        continue
      }
    }
  }

  // ❌ Si ningún intento fue válido, ya sí dejamos caer el error
  throw (
    lastError ??
    new Error('No se pudo generar un set válido luego de varios intentos')
  )
}
