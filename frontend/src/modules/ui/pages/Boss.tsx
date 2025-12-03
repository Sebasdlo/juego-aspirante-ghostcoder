// pages/Boss.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { assets } from '@scenes/assets/assets.manifest'
import OptionButton from '@ui/components/OptionButton'
import { useGame } from '@state/store'

import {
  getBossItem,
  answerBossItem,
  getSetSummary,
  getPlayerState,
  resetBossQuestion,
  resetBossRun
} from '@api/endpoints'

type RouteParams = {
  levelKey?: string
}

type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect'

const panelStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,.55)',
  border: '1px solid rgba(255,255,255,.22)',
  padding: 16,
  borderRadius: 12,
  color: '#fff'
}

const MAX_FAILS = 3

const Boss: React.FC = () => {
  const nav = useNavigate()
  const { levelKey: routeLevelKey } = useParams<RouteParams>()
  const levelKey = routeLevelKey || 'junior'

  // 👇 usamos setId y bootstrap desde el store
  const {
    setId,
    bootstrap,
    bossFailCount,       // 🔥 contador global
    incrementBossFail,   // 🔥 suma 1 y persiste por setId
    resetBossFail        // 🔥 limpia contador (y localStorage)
  } = useGame()

  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [totalBoss, setTotalBoss] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [answered, setAnswered] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)

  const [multiSel, setMultiSel] = useState<Set<number>>(new Set())
  const isMultiple = false

  const [bossNextIndex, setBossNextIndex] = useState<number | null>(null)

  const [showCongrats, setShowCongrats] = useState(false)

  // 🔥 ahora solo manejamos si mostramos el overlay o no localmente
  const [showFailOverlay, setShowFailOverlay] = useState(false)
  const [lastWrongIndex, setLastWrongIndex] = useState<number | null>(null)

  const displayOptions = isLoadingNext
    ? [
        'Cargando respuesta A…',
        'Cargando respuesta B…',
        'Cargando respuesta C…',
        'Cargando respuesta D…'
      ]
    : options

  const hasOptions = options.length > 0
  const narrativeText = question || 'Cargando reto del jefe…'

  // 👉 Cargar reto del Boss para un índice dado
  const loadBossQuestion = async (index: number, fromButton = false) => {
    if (!setId) return
    if (finished && !fromButton) return

    if (fromButton) {
      setIsLoadingNext(true)
    }

    setLoading(true)
    setError(null)
    setAnswered(false)
    setWasCorrect(null)
    setSelectedIndex(null)
    setExplanation(null)
    setMultiSel(new Set())

    try {
      const data = await getBossItem(setId, index)
      if (!data?.ok) {
        throw new Error('No se pudo cargar el reto del jefe')
      }

      setQuestion(data.question || '')
      setOptions(Array.isArray(data.options) ? data.options : [])
      setCurrentIndex(data.index ?? index)
      setTotalBoss(typeof data.total === 'number' ? data.total : null)
      setFinished(false)
      setBossNextIndex(null)
    } catch (e: any) {
      console.error('Error cargando el reto del jefe:', e)
      setError(e?.message || 'No se pudo cargar el reto del jefe')
    } finally {
      setLoading(false)
      setIsLoadingNext(false)
    }
  }

  // 1️⃣ Si no hay setId (recarga/F5) → reconstruimos el estado con bootstrap()
  useEffect(() => {
    if (setId) return

    const run = async () => {
      try {
        await bootstrap('junior')
      } catch (e) {
        console.error('Error en bootstrap dentro de Boss:', e)
      }
    }

    run()
  }, [setId, bootstrap])

  // 2️⃣ Cuando YA hay setId → pedimos player_state y cargamos la pregunta correcta
  useEffect(() => {
    if (!setId) return

    const run = async () => {
      try {
        const resp = await getPlayerState('junior')
        if (!resp?.ok) {
          await loadBossQuestion(16, true)
          return
        }

        const anyResp = resp as any
        const openSet = anyResp.openSet ?? null
        const serverNext = openSet?.next_index ?? null

        const startIndex =
          typeof serverNext === 'number' && serverNext >= 16 && serverNext <= 20
            ? serverNext
            : 16

        await loadBossQuestion(startIndex, true)
      } catch (e) {
        console.error('Error obteniendo player_state en Boss:', e)
        await loadBossQuestion(16, true)
      }
    }

    run()
  }, [setId]) // 👈 solo depende de setId

  // 3️⃣ Si el contador global de fallos llega a MAX_FAILS, mostramos overlay
  useEffect(() => {
    if (bossFailCount >= MAX_FAILS) {
      setFinished(true)
      setShowFailOverlay(true)
    }
  }, [bossFailCount])

  const getState = (i: number): OptionState => {
    if (!hasOptions) return 'idle'

    if (!answered) {
      if (isMultiple) {
        return multiSel.has(i) ? 'selected' : 'idle'
      }
      return selectedIndex === i ? 'selected' : 'idle'
    }

    if (answered && selectedIndex === i) {
      if (wasCorrect === true) return 'correct'
      if (wasCorrect === false) return 'incorrect'
    }
    return 'idle'
  }

  const submitAnswer = async (answer: number) => {
    if (!setId || currentIndex == null) return

    setLoading(true)
    setError(null)

    try {
      const res = await answerBossItem(setId, currentIndex, answer)

      setAnswered(true)
      setWasCorrect(res.correct)

      const anyRes = res as any
      setExplanation(anyRes.explanation ?? anyRes.message ?? null)

      // 🔹 Si la respuesta es INCORRECTA: NO avanzamos, sumamos fallo global
      if (!res.correct) {
        setLastWrongIndex(currentIndex)
        setBossNextIndex(null) // no avanzamos al siguiente reto

        // 🔥 usamos el store → persiste por set y se refleja en todo el juego
        incrementBossFail()

        // No miramos res.finished ni res.nextIndex si es incorrecto
        return
      }

      // 🔹 Si la respuesta es CORRECTA:
      if (res.finished) {
        // ✅ Ya se respondió la última correcta (ej. la 20) y el set quedó en nextIndex 21
        setFinished(true)
        setBossNextIndex(null)
        setShowCongrats(true) // 🔥 disparamos el mensaje de bienvenida a GhostCoder
      } else if (typeof res.nextIndex === 'number') {
        // ✅ Guardamos el next_index que maneja el SET en backend
        setBossNextIndex(res.nextIndex)
      }
    } catch (e: any) {
      console.error('Error enviando respuesta del jefe:', e)
      setError(e?.message || 'No se pudo enviar la respuesta del jefe')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = async (index: number) => {
    if (!hasOptions || loading || answered || finished) return

    if (isMultiple) {
      setMultiSel(prev => {
        const next = new Set(prev)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        return next
      })
      return
    }

    setSelectedIndex(index)
    await submitAnswer(index)
  }

  const answerMulti = async () => {
    if (!isMultiple) return
    if (multiSel.size === 0) return

    const first = Array.from(multiSel)[0]
    setSelectedIndex(first)
    await submitAnswer(first)
  }

  // 🔁 Siguiente reto del jefe (sólo si fue correcta y backend mandó nextIndex)
  const handleNextBoss = () => {
    if (bossNextIndex != null && !finished) {
      loadBossQuestion(bossNextIndex, true)
    }
  }

  // 🔁 Reintentar SÓLO la pregunta actual (cuando se equivocó una vez)
  const handleRetryQuestion = async () => {
    if (!setId || lastWrongIndex == null) return
    try {
      await resetBossQuestion(setId, lastWrongIndex)
      // volvemos a cargar esa misma pregunta
      await loadBossQuestion(lastWrongIndex, true)
    } catch (e: any) {
      console.error('Error al resetear intento de la pregunta del jefe:', e)
      setError(e?.message || 'No se pudo reintentar este reto del jefe')
    }
  }

  // 🔁 Repetir TODA la evaluación del jefe (cuando llegó a 3 fallos)
  const handleRestartBossRun = async () => {
    if (!setId) return
    try {
      setLoading(true)
      setError(null)

      await resetBossRun(setId)

      // 🔥 Reseteamos contador global de fallos
      resetBossFail()

      // Reseteamos estado local del boss
      setFinished(false)
      setShowFailOverlay(false)
      setShowCongrats(false)
      setBossNextIndex(null)
      setAnswered(false)
      setSelectedIndex(null)
      setWasCorrect(null)
      setExplanation(null)
      setLastWrongIndex(null)

      // Volvemos a empezar desde la 16
      await loadBossQuestion(16, true)
    } catch (e: any) {
      console.error('Error al resetear la evaluación del jefe:', e)
      setError(
        e?.message ||
          'No se pudo reiniciar la evaluación del jefe. Intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!setId) {
      nav('/')
      return
    }

    try {
      await getSetSummary(setId)
    } catch (e) {
      console.error('Error obteniendo resumen del set:', e)
    } finally {
      nav('/result')
    }
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
        src={assets.bg.jefes}
        alt="Fondo Boss"
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
          zIndex: 4
        }}
      >
        <h2
          style={{
            color: '#fff',
            textShadow: '0 2px 6px rgba(0,0,0,.6)'
          }}
        >
          Jefe del nivel
        </h2>

        <div
          className="card"
          style={{
            ...panelStyle,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <img
            src={assets.characters.boss}
            alt="Jefe"
            style={{
              height: 64,
              borderRadius: 12,
              objectFit: 'cover'
            }}
          />
          <div>
            <strong>Ramírez, Jefe del nivel</strong>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {finished && showCongrats
                ? 'Has completado el reto del jefe.'
                : totalBoss && currentIndex
                ? `Reto del jefe · Pregunta ${currentIndex} de ${totalBoss}`
                : 'Reto final del nivel'}
            </div>
            {/* 🔹 Info de fallos */}
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
              Fallos: {bossFailCount}/{MAX_FAILS}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gap: 12,
          padding: '120px 24px 24px',
          zIndex: 2
        }}
      >
        {/* Explicación */}
        <div
          className="card"
          style={{
            ...panelStyle,
            width: 'min(1100px, 92%)',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
          aria-live="polite"
          role="status"
        >
          <h3 style={{ margin: 0 }}>Explicación</h3>
          <div style={{ fontSize: '0.9rem' }}>
            {answered || finished
              ? explanation || 'Sin explicación devuelta por el backend.'
              : 'Aquí aparecerá la explicación después de responder.'}
          </div>
          {error && (
            <p
              style={{
                marginTop: 8,
                color: '#ffd3d3',
                fontSize: '0.85rem'
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Narrativa */}
        <div
          className="card"
          style={{
            ...panelStyle,
            width: 'min(1100px, 92%)',
            margin: '0 auto',
            minHeight: 56,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <p style={{ margin: 0 }}>
            {isLoadingNext
              ? 'Cargando siguiente reto del jefe…'
              : narrativeText}
          </p>
        </div>

        {/* Opciones */}
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <div
            style={{
              display: 'grid',
              gap: 18,
              gridTemplateColumns: '1fr 1fr',
              width: 'min(1100px, 92%)'
            }}
          >
            {displayOptions.length === 0 && (
              <p style={{ margin: 0 }}>No hay opciones para este reto.</p>
            )}

            {displayOptions.map((text, index0) => {
              const index = index0 + 1 // 1→A, 2→B, 3→C, 4→D
              return (
                <OptionButton
                  key={index}
                  label={String.fromCharCode(64 + index)} // 1→A, 2→B, 3→C, 4→D
                  text={text}
                  state={getState(index)}
                  disabled={loading || finished}
                  onClick={() => handleSelect(index)}
                />
              )
            })}
          </div>
        </div>

        {/* Botonera */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            alignItems: 'end'
          }}
        >
          {/* Siguiente reto del Boss (solo si ya respondiste CORRECTO
              y el backend mandó nextIndex) */}
          {!finished &&
            answered &&
            !loading &&
            wasCorrect === true &&
            bossNextIndex != null && (
              <button onClick={handleNextBoss}>Siguiente reto</button>
            )}

          {/*
            Si la respuesta fue incorrecta, aún no terminaste,
            y no llegaste al máximo de fallos → SOLO mostramos "Reintentar este reto".
          */}
          {!finished &&
          answered &&
          !loading &&
          wasCorrect === false &&
          lastWrongIndex != null &&
          bossFailCount < MAX_FAILS ? (
            <button onClick={handleRetryQuestion}>
              Reintentar este reto
            </button>
          ) : (
            // En cualquier otro caso, mostramos "Volver al nivel"
            <button onClick={() => nav(`/level/${levelKey}`)}>
              Volver al nivel
            </button>
          )}
        </div>
      </div>

      {/* Overlay de FELICITACIÓN final */}
      {showCongrats && !showFailOverlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            background: 'rgba(0,0,0,.65)',
            display: 'grid',
            placeItems: 'center',
            padding: 24
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Felicitación final del jefe"
        >
          <div
            className="card"
            style={{
              width: 'min(900px, 92%)',
              background: 'rgba(0,0,0,.75)',
              border: '1px solid rgba(255,255,255,.25)',
              borderRadius: 12,
              padding: 24,
              display: 'grid',
              gap: 16,
              textAlign: 'center'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10
              }}
            >
              <img
                src={assets.characters.boss}
                alt="Ramírez, Jefe del nivel"
                style={{
                  width: 96,
                  borderRadius: 16,
                  objectFit: 'cover'
                }}
              />
              <h3 style={{ margin: 0 }}>🏁 Evaluación del nivel superado </h3>
            </div>

            <p
              style={{
                margin: 0,
                whiteSpace: 'pre-line',
                lineHeight: 1.5,
                fontSize: '0.98rem',
                maxWidth: '90%',
                justifySelf: 'center'
              }}
            >
              Has demostrado que tu lógica puede estar al nivel de las IA. Bienvenido a{' '}
              GhostCoder.
              {'\n'}
              Prepárate, porque lo que viene ya no será solo simulación: será la realidad.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={handleFinish}>
                Ver resultado final del nivel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 Overlay de EVALUACIÓN FALLIDA (3 fallos) */}
      {showFailOverlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 11,
            background: 'rgba(0,0,0,.75)',
            display: 'grid',
            placeItems: 'center',
            padding: 24
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Evaluación del jefe fallida"
        >
          <div
            className="card"
            style={{
              width: 'min(900px, 92%)',
              background: 'rgba(0,0,0,.8)',
              border: '1px solid rgba(255,255,255,.3)',
              borderRadius: 12,
              padding: 24,
              display: 'grid',
              gap: 16,
              textAlign: 'center'
            }}
          >
            <h3 style={{ margin: 0 }}>⚠ Evaluación del jefe no superada</h3>
            <p
              style={{
                margin: 0,
                whiteSpace: 'pre-line',
                lineHeight: 1.5,
                fontSize: '0.95rem',
                maxWidth: '90%',
                justifySelf: 'center'
              }}
            >
              Fallaste la evaluación del jefe en este intento.
              {'\n'}
              Vuelve a repetir la evaluación del jefe para poder pasar de nivel.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                onClick={handleRestartBossRun}
                style={{ minWidth: 180, padding: '10px 18px' }}
              >
                Repetir evaluación del jefe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Boss
