// pages/Challenger.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { assets } from '@scenes/assets/assets.manifest'
import OptionButton from '@ui/components/OptionButton'
import { useGame } from '@state/store'
import { getMentorNextItem, answerMentorItem } from '@api/endpoints'

type RouteParams = {
  levelKey?: string
  mentorKey?: string
}

type MentorMeta = {
  key: string
  name: string
  backendName: string
  src: string
}

type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect'

const panelStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,.55)',
  border: '1px solid rgba(255,255,255,.22)',
  padding: 16,
  borderRadius: 12,
  color: '#fff'
}

const mentorsMap = (
  characters: typeof assets.characters
): Record<string, MentorMeta> => ({
  camila: {
    key: 'camila',
    name: 'Camila (back-end)',
    backendName: 'Camila',
    src: characters.camila
  },
  hernan: {
    key: 'hernan',
    name: 'Hernán (automatización)',
    backendName: 'Hernán',
    src: characters.hernan
  },
  sofia: {
    key: 'sofia',
    name: 'Sofía (soluciones)',
    backendName: 'Sofía',
    src: characters.sofia
  },
  diego: {
    key: 'diego',
    name: 'Diego (seguridad)',
    backendName: 'Diego',
    src: characters.diego
  },
  lucia: {
    key: 'lucia',
    name: 'Lucía (datos)',
    backendName: 'Lucía',
    src: characters.lucia
  }
})

const Challenger: React.FC = () => {
  const nav = useNavigate()
  const { levelKey: routeLevelKey, mentorKey } = useParams<RouteParams>()
  const levelKey = routeLevelKey || 'junior'

  const { setId, markMentorCompleted } = useGame()

  const allMentors = useMemo(() => mentorsMap(assets.characters), [])
  const mentor = mentorKey ? allMentors[mentorKey] : undefined

  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [kind, setKind] = useState<'main' | 'random' | 'boss' | null>(null)
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)

  const [remainingForMentor, setRemainingForMentor] = useState<number[]>([])
  const [finishedForMentor, setFinishedForMentor] = useState(false)

  // 🔹 Nuevo: intro cuando el reto es random
  const [showRandomIntro, setShowRandomIntro] = useState(false)

  const randomMode = kind === 'random'
  const randomLeft = remainingForMentor.length
  const mainLeft = remainingForMentor.length
  const hasOptions = options.length > 0
  const displayOptions = isLoadingNext
    ? [
        'Cargando respuesta A…',
        'Cargando respuesta B…',
        'Cargando respuesta C…',
        'Cargando respuesta D…'
      ]
    : options
  const narrativeText = finishedForMentor
    ? 'No quedan más retos para este mentor. Vuelve al nivel y elige otro mentor o ve al Boss.'
    : (question || 'Cargando reto…')

  // Redirecciones básicas
  useEffect(() => {
    if (!setId) {
      nav('/')
      return
    }
    if (!mentor) {
      nav(`/level/${levelKey}`)
    }
  }, [setId, mentor, nav, levelKey])

  // función para cargar el siguiente reto de este mentor
  const loadNextQuestion = async (fromButton: boolean) => {
    if (!setId || !mentor) return
    if (finishedForMentor) return

    if (fromButton) {
      setIsLoadingNext(true) // solo cuando viene del botón
    }

    setLoading(true)
    setError(null)
    setAnswered(false)
    setWasCorrect(null)
    setSelectedIndex(null)
    setExplanation(null)

    try {
      const data = await getMentorNextItem(setId, mentor.backendName)
      const anyData = data as any

      // 👇 Si el backend indica que este mentor ya terminó
      if (anyData?.finishedForMentor) {
        setFinishedForMentor(true)
        setQuestion('')
        setOptions([])

        if (mentorKey) {
          markMentorCompleted(mentorKey)
        }

        return
      }

      // Caso normal: el backend devuelve un ítem
      setQuestion(anyData.question || '')
      setOptions(Array.isArray(anyData.options) ? anyData.options : [])
      setKind(anyData.kind)
      setCurrentIndex(anyData.index ?? null)

      // 🔹 Si el reto es random, mostramos el “evento inesperado”
      if (anyData.kind === 'random') {
        setShowRandomIntro(true)
      }
    } catch (e: any) {
      console.error('Error cargando reto del mentor:', e)
      setError(e?.message || 'No se pudo cargar el reto del mentor')
    } finally {
      setLoading(false)
      setIsLoadingNext(false)
    }
  }

  // cargar la primera pregunta al entrar
  useEffect(() => {
    setFinishedForMentor(false)
    setShowRandomIntro(false) // por si vienes de otro mentor
    loadNextQuestion(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, mentorKey])

  const getState = (i: number): OptionState => {
    if (!hasOptions) return 'idle'
    if (!answered) {
      return selectedIndex === i ? 'selected' : 'idle'
    }
    if (answered && selectedIndex === i) {
      if (wasCorrect === true) return 'correct'
      if (wasCorrect === false) return 'incorrect'
    }
    return 'idle'
  }

  const handleSelect = async (i: number) => {
    if (!hasOptions || loading || answered || !setId || !mentor) return

    setSelectedIndex(i)
    setLoading(true)
    setError(null)

    try {
      const res = await answerMentorItem(
        setId,
        mentor.backendName,
        i,
        currentIndex ?? undefined
      )

      setAnswered(true)
      setWasCorrect(res.correct)
      setExplanation(res.explanation ?? null)
      setRemainingForMentor(res.remainingForMentor ?? [])
      setFinishedForMentor(!!res.finishedForMentor)

      if (res.finishedForMentor && mentorKey) {
        markMentorCompleted(mentorKey)
      }
    } catch (e: any) {
      console.error('Error enviando respuesta del mentor:', e)
      setError(e?.message || 'No se pudo enviar la respuesta')
    } finally {
      setLoading(false)
    }
  }

  const isMultiple = false
  const randomLabel = randomMode ? 'RETO ALEATORIO' : 'RETO ACTUAL'

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

      {/* Header */}
      <div
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 3
        }}
      >
        <h2
          style={{
            color: '#fff',
            textShadow: '0 2px 6px rgba(0,0,0,.6)'
          }}
        >
          {randomLabel}
        </h2>

        {mentor && (
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
              src={mentor.src}
              alt={mentor.name}
              style={{
                height: 64,
                borderRadius: 12,
                objectFit: 'cover'
              }}
            />
            <div>
              <strong>{mentor.name}</strong>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {randomMode
                  ? `Mentor evaluando reto espontáneo · Aleatorios restantes: ${randomLeft}`
                  : `Mentor evaluando este reto${
                      answered ? ` · Main restantes: ${mainLeft}` : ''
                    }`}
              </div>
            </div>
          </div>
        )}
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
            {answered
              ? explanation || 'Sin explicación devuelta por el backend.'
              : 'Aquí aparecerá la explicación después de responder.'}
          </div>
          {error && (
            <p style={{ marginTop: 8, color: '#ffd3d3', fontSize: '0.85rem' }}>
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
            {isLoadingNext ? 'Cargando siguiente reto…' : narrativeText}
          </p>
        </div>

        {/* Opciones */}
        {!finishedForMentor && (
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <div
            style={{
              display: 'grid',
              gap: 18,
              gridTemplateColumns: '1fr 1fr',
              width: 'min(1100px, 92%)'
            }}
          >
            {/* Mensaje solo si de verdad no hay opciones y no estamos cargando */}
            {!isLoadingNext && !hasOptions && (
              <p style={{ margin: 0 }}>No hay opciones para este reto.</p>
            )}

            {displayOptions.map((text, index0) => {
              const index = index0 + 1 // 1,2,3,4

              return (
                <OptionButton
                  key={index}
                  label={String.fromCharCode(64 + index)} // 1→A, 2→B, 3→C, 4→D
                  text={text}
                  state={getState(index)}
                  disabled={
                    !hasOptions || answered || loading || isLoadingNext
                  }
                  onClick={() => handleSelect(index)}
                />
              )
            })}
          </div>
        </div>
        )}
        {/* Mensaje + Botonera */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}
        >
            {/* NUEVO MENSAJE DE CONFIRMACIÓN ABAJO EN BOTONES */}
          {finishedForMentor && (
            <p style={{ marginTop: 10, fontSize: '0.85rem', color: '#9df8c3' }}>
              ✔ Respondiste todas las preguntas de este mentor.
            </p>
          )}
          {finishedForMentor && (
            <p style={{ marginTop: 4, fontSize: '0.9rem', color: '#c8ffda' }}>
              Has completado los retos de este mentor. Puedes volver al nivel o
              probar con otro mentor.
            </p>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            {!finishedForMentor && answered && !loading && (
              <button onClick={() => loadNextQuestion(true)}>
                Siguiente reto
              </button>
            )}

            {/* 👇 Solo mostramos "Volver" cuando NO es random,
                o cuando ya terminaste todos los retos del mentor */}
            {(!randomMode || finishedForMentor) && (
              <Link to={`/level/${levelKey}`}>
                <button>Volver</button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 🔹 Overlay de EVENTO INESPERADO para retos random */}
      {showRandomIntro && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            background: 'rgba(0,0,0,.55)',
            display: 'grid',
            placeItems: 'center',
            padding: 24
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Evento inesperado"
        >
          <div
            className="card"
            style={{
              width: 'min(900px, 92%)',
              background: 'rgba(0,0,0,.6)',
              border: '1px solid rgba(255,255,255,.2)',
              borderRadius: 12,
              padding: 20,
              display: 'grid',
              gap: 14,
              textAlign: 'center'
            }}
          >
            <h3 style={{ margin: '0 0 8px 0' }}>⚡ Evento inesperado</h3>
            <p
              style={{
                margin: 0,
                whiteSpace: 'pre-line',
                lineHeight: 1.45,
                fontSize: '0.95rem',
                maxWidth: '90%',
                justifySelf: 'center'
              }}
            >
              Mientras completabas con el utimo reto, tu mentor ha decidido lanzarte un
              reto aleatorio para evaluarte bajo presión. ¡Tendrás que resolverlo!
              {'\n'}
              Mantén la calma, piensa rápido y demuestra cómo reaccionas ante lo imprevisto.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <button
                onClick={() => setShowRandomIntro(false)}
                style={{ minWidth: 160, padding: '10px 18px' }}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Challenger
