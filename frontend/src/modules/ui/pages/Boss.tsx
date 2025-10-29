import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@state/store'
import { assets } from '@scenes/assets/assets.manifest'
import { Api, type ItemDTO, type AnswerResp } from '@api/services/Index'
import OptionButton from '@ui/components/OptionButton'
import { TOTAL_ITEMS, NEEDED } from '@domain/constants'

export default function Boss() {
  React.useEffect(() => { document.title = 'Boss | GhostCoder' }, [])

  const { levelKey = 'junior' } = useParams()
  const nav = useNavigate()
  const store = useStore()
  const { progress } = store

  const [item, setItem] = useState<ItemDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selección y feedback
  const [selected, setSelected] = useState<number | null>(null)      // single
  const [multiSel, setMultiSel] = useState<Set<number>>(new Set())   // multiple
  const [explanation, setExplanation] = useState<string | null>(null)
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  const answered = wasCorrect !== null

  const eligible = (progress?.score ?? 0) >= NEEDED

  const panelStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255,255,255,.12)',
    borderRadius: 12,
    padding: '12px 14px',
    boxShadow: '0 8px 24px rgba(0,0,0,.25)',
    backdropFilter: 'blur(1px)',
    color: '#fff'
  }

  useEffect(() => {
    // Cargar item del Boss sólo si es elegible
    if (!eligible || !progress?.setId) {
      setItem(null)
      setLoading(false)
      setError(null)
      setSelected(null)
      setMultiSel(new Set())
      setExplanation(null)
      setWasCorrect(null)
      return
    }

    setLoading(true)
    setError(null)
    setSelected(null)
    setMultiSel(new Set())
    setExplanation(null)
    setWasCorrect(null)

    const bossIndex = TOTAL_ITEMS
    Api.getItem(progress.setId, bossIndex)
      .then((dto) => setItem(dto ?? null))
      .catch((e: any) => setError(e?.message || 'No se pudo cargar el reto del boss.'))
      .finally(() => setLoading(false))
  }, [eligible, progress?.setId])

  // Opciones (con fallback mientras no llega el item)
  const optionTexts = useMemo<string[]>(() => {
    if (!item) return []
    const arr = (item.options && item.options.length ? item.options : item.answers) ?? []
    return arr.slice(0, 4)
  }, [item])

  const hasOptions = optionTexts.length > 0
  const renderOptions = hasOptions ? optionTexts : ['—', '—', '—', '—']

  // Detección multi-select
  const isMultiple = !!(
    (item as any)?.allowMultiple === true ||
    Array.isArray((item as any)?.correctIndices) ||
    Array.isArray((item as any)?.correctKeys) ||
    (item as any)?.type === 'multi' ||
    (item as any)?.multiple === true
  )

  const correctIndex = !isMultiple ? (item as any)?.correctIndex ?? null : null

  const getState = (idx: number): 'idle'|'selected'|'correct'|'incorrect' => {
    if (!answered) {
      return isMultiple
        ? (multiSel.has(idx) ? 'selected' : 'idle')
        : (selected === idx ? 'selected' : 'idle')
    }
    if (!isMultiple && correctIndex != null) {
      if (idx === correctIndex) return 'correct'
      if (idx === selected)     return 'incorrect'
      return 'idle'
    }
    // múltiple o sin índice: colorear seleccionados según wasCorrect global
    return isMultiple
      ? (multiSel.has(idx)
          ? (wasCorrect === true ? 'correct' : wasCorrect === false ? 'incorrect' : 'selected')
          : 'idle')
      : (selected === idx
          ? (wasCorrect === true ? 'correct' : wasCorrect === false ? 'incorrect' : 'selected')
          : 'idle')
  }

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

  // Responder (single/multi)
  const answerSingle = async (i: number) => {
    if (!eligible || answered) return
    if (!progress?.setId) return
    setSelected(i)
    try {
      const bossIndex = TOTAL_ITEMS
      const resp = await Api.answerItem(progress.setId, bossIndex, i)
      const ok = !!resp?.correct
      setWasCorrect(ok)
      setExplanation(resp?.explanation ?? null)
      applyAnswerToStore(resp, ok)
    } catch {
      setWasCorrect(null)
    }
  }

  const answerMulti = async () => {
    if (!eligible || answered) return
    if (!progress?.setId) return
    const picks = Array.from(multiSel.values()).sort((a,b)=>a-b)
    if (picks.length === 0) return

    try {
      const anyApi = Api as any
      const bossIndex = TOTAL_ITEMS
      let resp: AnswerResp | null | undefined
      if (typeof anyApi.answerItemMulti === 'function') {
        resp = await anyApi.answerItemMulti(progress.setId, bossIndex, picks)
      } else {
        resp = await (anyApi.answerItem(progress.setId, bossIndex, picks) as Promise<AnswerResp>)
      }
      const ok = !!resp?.correct
      setWasCorrect(ok)
      setExplanation(resp?.explanation ?? null)
      applyAnswerToStore(resp, ok)
    } catch {
      setWasCorrect(null)
    }
  }

  const onOptionClick = (i: number) => {
    if (!hasOptions || answered) return
    if (isMultiple) {
      setMultiSel(prev => {
        const next = new Set(prev)
        if (next.has(i)) next.delete(i); else next.add(i)
        return next
      })
    } else {
      answerSingle(i)
    }
  }

  // Narrativa del Boss
  const narrativeText =
    !eligible ? `Aún no puedes enfrentar al jefe. Requiere ${NEEDED}/${TOTAL_ITEMS} aciertos.`
    : loading ? 'Cargando reto final…'
    : error ? 'No se pudo cargar el reto del boss.'
    : (item?.question || 'Aquí aparecerá el reto final cuando el backend lo provea.')

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
      <img
        src={assets.bg.jefes}
        alt="Fondo Boss"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
          objectFit: 'cover',
          objectPosition: 'center'
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
          zIndex: 4
        }}
      >
        <h2 style={{ color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>
          Jefe del nivel
        </h2>

        <div className="card" style={{ ...panelStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={assets.characters.boss} alt="Jefe" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} />
          <div>
            <strong>Ramírez</strong>
            <div style={{ fontSize: 12, opacity: .85 }}>
              {eligible ? 'Desbloqueado' : 'Bloqueado'}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido en grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateRows: 'auto auto auto auto',
          gap: 12,
          padding: '120px 24px 24px', // espacio superior por header
          zIndex: 3
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

        {/* Narrativa */}
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
                disabled={!eligible || !hasOptions || answered}
                onClick={() => eligible && hasOptions && onOptionClick(i)}
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
          <button onClick={() => nav(`/level/${levelKey}`)}>Volver al nivel</button>
          <button onClick={() => nav('/result')}>Terminar</button>
        </div>
      </div>
    </div>
  )
}
