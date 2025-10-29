import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams, useSearchParams, Link } from 'react-router-dom'
import { assets } from '@scenes/assets/assets.manifest'
import { Api, type ItemDTO, type AnswerResp } from '@api/services/Index'
import { useStore } from '@state/store'
import OptionButton from '@ui/components/OptionButton'

const mentorInfo = (key?: string) => {
  switch (key) {
    case 'camila': return { name: 'Camila (back-end)',       src: assets.characters.camila }
    case 'hernan': return { name: 'Hernán (automatización)', src: assets.characters.hernan }
    case 'sofia':  return { name: 'Sofía (soluciones)',      src: assets.characters.sofia }
    case 'diego':  return { name: 'Diego (seguridad)',       src: assets.characters.diego }
    case 'lucia':  return { name: 'Lucía (datos)',           src: assets.characters.lucia }
    default:       return { name: 'Mentor',                  src: assets.characters.camila }
  }
}

export default function Challenge() {
  React.useEffect(() => { document.title = 'Challenge | GhostCoder' }, [])

  const { levelKey = '' } = useParams()
  const [qs] = useSearchParams()
  const location = useLocation() as any
  const store = useStore()
  const { progress } = store

  const mentorKey: string | undefined =
    (qs.get('mentor') as string | undefined) ??
    (location?.state?.mentor as string | undefined)
  const mentor = mentorInfo(mentorKey)

  const [item, setItem] = useState<ItemDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // selección y feedback
  const [selected, setSelected] = useState<number | null>(null)         // single
  const [multiSel, setMultiSel] = useState<Set<number>>(new Set())      // multiple
  const [answered, setAnswered] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)

  // aleatorios
  const [randomMode, setRandomMode] = useState(false)
  const [randomLeft, setRandomLeft] = useState<number>(() => {
    const anyStore = store as any
    return typeof anyStore.getRandomLeft === 'function'
      ? Number(anyStore.getRandomLeft()) || 3
      : 3
  })

  const panelStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: 12,
    padding: '12px 14px',
    boxShadow: '0 8px 24px rgba(0,0,0,.25)',
    backdropFilter: 'blur(1px)',
    color: '#fff'
  }

  // cargar item
  const fetchItem = async () => {
    if (!progress?.setId || progress?.nextIndex == null) {
      setItem(null); setLoading(false); setError(null)
      setSelected(null); setMultiSel(new Set()); setAnswered(false); setExplanation(null); setWasCorrect(null)
      setRandomMode(false)
      return
    }
    setLoading(true)
    setError(null)
    setSelected(null)
    setMultiSel(new Set())
    setAnswered(false)
    setExplanation(null)
    setWasCorrect(null)

    const anyApi = Api as any
    const setId = progress.setId
    const idx = progress.nextIndex as number

    try {
      let dto: ItemDTO | null = null
      if (randomMode && typeof anyApi?.getRandomItem === 'function') {
        dto = await anyApi.getRandomItem(setId)
      } else {
        dto = await Api.getItem(setId, idx)
      }
      setItem(dto ?? null)
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el reto')
    } finally {
      setLoading(false)
    }
  }

  // 🛡️ Evitar dobles/triples fetch en dev (StrictMode) con bandera por clave
  const didFetchRef = useRef<string | null>(null)

  useEffect(() => {
    const key = `${progress?.setId ?? ''}:${progress?.nextIndex ?? ''}:${randomMode ? 'R' : 'N'}`
    if (didFetchRef.current === key) return
    didFetchRef.current = key
    fetchItem()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress?.setId, progress?.nextIndex, randomMode])

  const applyAnswerToStore = (r: AnswerResp | null | undefined, correct: boolean) => {
    const anyStore = store as any
    const prevScore = progress?.score ?? 0
    const prevNext  = progress?.nextIndex ?? 1
    const nextIndex = r?.nextIndex ?? (prevNext + 1)
    const score     = r?.score ?? (prevScore + (correct ? 1 : 0))

    if (typeof anyStore.applyAnswerResult === 'function') {
      anyStore.applyAnswerResult({ score, nextIndex })
    } else if (typeof anyStore.setProgress === 'function') {
      anyStore.setProgress({ ...progress, score, nextIndex })
    } else {
      if (typeof anyStore.addScore === 'function') anyStore.addScore(correct ? 1 : 0)
      if (typeof anyStore.setNextIndex === 'function') anyStore.setNextIndex(nextIndex)
    }
  }

  const isMultiple = !!(
    (item as any)?.allowMultiple === true ||
    Array.isArray((item as any)?.correctIndices) ||
    Array.isArray((item as any)?.correctKeys) ||
    (item as any)?.type === 'multi' ||
    (item as any)?.multiple === true
  )

  // responder
  const answerSingle = async (i: number) => {
    if (answered || !item) return
    if (!progress?.setId || progress?.nextIndex == null) return
    setSelected(i)
    setAnswered(true)
    try {
      const resp = await Api.answerItem(progress.setId, progress.nextIndex as number, i)
      const ok = !!resp?.correct
      setWasCorrect(ok)
      setExplanation(resp?.explanation ?? null)
      applyAnswerToStore(resp, ok)
      maybeScheduleRandom()
    } catch {
      setWasCorrect(null)
      setRandomMode(false)
    }
  }

  const answerMulti = async () => {
    if (answered || !item) return
    if (!progress?.setId || progress?.nextIndex == null) return
    const picks = Array.from(multiSel.values()).sort((a,b)=>a-b)
    if (picks.length === 0) return
    setAnswered(true)
    try {
      const anyApi = Api as any
      let resp: AnswerResp | null | undefined
      if (typeof anyApi.answerItemMulti === 'function') {
        resp = await anyApi.answerItemMulti(progress.setId, progress.nextIndex as number, picks)
      } else {
        resp = await (anyApi.answerItem(progress.setId, progress.nextIndex as number, picks) as Promise<AnswerResp>)
      }
      const ok = !!resp?.correct
      setWasCorrect(ok)
      setExplanation(resp?.explanation ?? null)
      applyAnswerToStore(resp, ok)
      maybeScheduleRandom()
    } catch {
      setWasCorrect(null)
      setRandomMode(false)
    }
  }

  const maybeScheduleRandom = () => {
    const anyApi = Api as any
    const anyStore = store as any
    const canRandom = randomLeft > 0 && typeof anyApi?.getRandomItem === 'function'
    if (!canRandom) { setRandomMode(false); return }
    setRandomLeft((n) => {
      const v = Math.max(0, (n ?? 0) - 1)
      if (typeof anyStore.setRandomLeft === 'function') anyStore.setRandomLeft(v)
      return v
    })
    setRandomMode(true)
  }

  const toggleMulti = (i: number) => {
    if (answered) return
    setMultiSel(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }
  const handleSelect = (i: number) => { isMultiple ? toggleMulti(i) : answerSingle(i) }

  // datos visuales
  const optionTexts = useMemo<string[]>(() => {
    if (!item) return []
    const arr = (item.options && item.options.length ? item.options : item.answers) ?? []
    return arr.slice(0, 4)
  }, [item])

  const hasOptions = optionTexts.length > 0
  const renderOptions = hasOptions ? optionTexts : ['—', '—', '—', '—'] // fallback SIEMPRE

  const correctIndex = item?.correctIndex ?? null
  const narrativeText =
    loading ? 'Cargando reto…'
    : error ? 'No se pudo cargar el reto.'
    : (item?.question || 'Aquí irá la narrativa, contexto e instrucción del reto generado para el jugador.')

  const getState = (idx: number): 'idle'|'selected'|'correct'|'incorrect' => {
    if (!answered) {
      if (isMultiple) return multiSel.has(idx) ? 'selected' : 'idle'
      return selected === idx ? 'selected' : 'idle'
    }
    if (correctIndex != null && !isMultiple) {
      if (idx === correctIndex) return 'correct'
      if (idx === selected)     return 'incorrect'
      return 'idle'
    }
    if (isMultiple) {
      return multiSel.has(idx)
        ? (wasCorrect === true ? 'correct' : wasCorrect === false ? 'incorrect' : 'selected')
        : 'idle'
    }
    if (idx === selected) {
      if (wasCorrect === true) return 'correct'
      if (wasCorrect === false) return 'incorrect'
      return 'selected'
    }
    return 'idle'
  }

  return (
    <div
      className="card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        aspectRatio: '16 / 9',
        background: 'black',
        borderRadius: 16
      }}
    >
      {/* Fondo */}
      <img
        src={assets.bg.reto}
        alt="Fondo Reto"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
          objectFit: 'cover',
          objectPosition: 'center',
          filter: 'brightness(.9)'
        }}
      />

      {/* Header fuera del grid */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 3
        }}
      >
        <h2 style={{ color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>
          {randomMode ? 'RETO ALEATORIO' : 'RETO ACTUAL'}
        </h2>
        <div className="card" style={{ ...panelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={mentor.src} alt={mentor.name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} />
          <div>
            <strong>{mentor.name}</strong>
            <div style={{ fontSize: 12, opacity: .85 }}>
              {randomMode ? `Mentor evaluando reto espontáneo · Aleatorios restantes: ${randomLeft}` : 'Mentor evaluando este reto'}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido en grid (Explicación + Narrativa + Opciones + Botonera) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gap: 12,
          padding: '120px 24px 24px', // espacio superior por header
          zIndex: 2
        }}
      >
        {/* Explicación: SIEMPRE visible (mismo estilo que narrativa) */}
        <div
          className="card"
          style={{ ...panelStyle, width: 'min(1100px, 92%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 6 }}
          aria-live="polite"
          role="status"
        >
          <h3 style={{ margin: 0 }}>Explicación</h3>
          <div>{answered ? (explanation || 'Sin explicación del backend.') : 'Aquí aparecerá la explicación después de responder.'}</div>
        </div>

        {/* Narrativa pegada a las opciones */}
        <div className="card" style={{ ...panelStyle, width: 'min(1100px, 92%)', margin: '0 auto', minHeight: 56, display: 'flex', alignItems: 'center' }}>
          <p style={{ margin: 0 }}>{narrativeText}</p>
        </div>

        {/* Opciones (con fallback) */}
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <div style={{ display: 'grid', gap: 18, gridTemplateColumns: '1fr 1fr', width: 'min(1100px, 92%)' }}>
            {renderOptions.map((text, i) => (
              <OptionButton
                key={i}
                label={String.fromCharCode(65 + i)}
                text={text}
                state={getState(i)}
                disabled={!hasOptions || answered}
                onClick={() => hasOptions && handleSelect(i)}
              />
            ))}
          </div>
        </div>

        {/* Botonera */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'end' }}>
          {isMultiple && !answered && (
            <button onClick={answerMulti} disabled={multiSel.size === 0}>
              Responder
            </button>
          )}
          <Link to={`/level/${levelKey}`}><button>Volver</button></Link>
          <Link to={`/boss/${levelKey}`}><button>Ir al Boss (visual)</button></Link>
        </div>
      </div>
    </div>
  )
}
