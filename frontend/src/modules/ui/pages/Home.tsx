// pages/HomeJunior.tsx 
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { assets } from '@scenes/assets/assets.manifest'
import { healthz, startLevel, getLore, getLevelContext, getPlayerState } from '@api/endpoints'
import { useGame } from '@state/store'

const LEVEL_KEY = 'junior'

type IntroStep = {
  title?: string
  text: string
  img?: string
}

// -------------------------------
// Helpers para extraer texto/título
// -------------------------------
function extractText(source: any): string | undefined {
  if (!source) return undefined
  if (typeof source === 'string') return source

  if (Array.isArray(source)) {
    for (const item of source) {
      const t = extractText(item)
      if (t) return t
    }
    return undefined
  }

  if (typeof source === 'object') {
    const {
      body_markdown,
      body,
      intro_markdown,
      summary,
      text,
      description
    } = source as any

    return (
      (typeof body_markdown === 'string' && body_markdown) ||
      (typeof body === 'string' && body) ||
      (typeof intro_markdown === 'string' && intro_markdown) ||
      (typeof summary === 'string' && summary) ||
      (typeof text === 'string' && text) ||
      (typeof description === 'string' && description) ||
      undefined
    )
  }

  return undefined
}

function extractTitle(source: any): string | undefined {
  if (!source || typeof source !== 'object') return undefined
  const { title, slug, name } = source as any
  return (
    (typeof title === 'string' && title) ||
    (typeof name === 'string' && name) ||
    (typeof slug === 'string' && slug) ||
    undefined
  )
}

const Home: React.FC = () => {
  const nav = useNavigate()
  const { setId,  bootstrap, hardReset } = useGame()
  // 👇 NUEVO estado local solo para este botón
  const [hasSeniorOpen, setHasSeniorOpen] = useState(false)
  const [loadingSenior, setLoadingSenior] = useState(true)

  const [status, setStatus] = useState('Comprobando API…')
  const [loading, setLoading] = useState(false)

  // Estado INTRO
  const [showIntro, setShowIntro] = useState(false)
  const [introSteps, setIntroSteps] = useState<IntroStep[]>([])
  const [introIndex, setIntroIndex] = useState(0)
  const [introLoading, setIntroLoading] = useState(false)
  const [introError, setIntroError] = useState<string | null>(null)

  // Saber cuándo /start terminó OK
  const [startReady, setStartReady] = useState(false)

  // 🚀 Boot SIEMPRE al entrar (recargues o no)
  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      try {
        await Promise.all([healthz(), bootstrap('junior')])
        if (!cancelled) setStatus('API lista ✔')
      } catch {
        if (!cancelled) setStatus('Error conectando con la API ❌')
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [bootstrap])

useEffect(() => {
    const run = async () => {
      try {
        const resp = await getPlayerState('senior')
        if (!resp?.ok) {
          setHasSeniorOpen(false)
          return
        }

        const anyResp = resp as any
        const openSet = anyResp.openSet ?? null
        const lastCompletedSet = anyResp.lastCompletedSet ?? null

        // ✅ Si hay set abierto o completado en senior, activamos el botón
        setHasSeniorOpen(!!(openSet || lastCompletedSet))
      } catch {
        setHasSeniorOpen(false)
      } finally {
        setLoadingSenior(false)
      }
    }

    run()
  }, [])  

  // 👉 Avanzar escenas de la INTRO
  const nextIntro = () => {
    if (introLoading || introError) return

    const isLast = introIndex + 1 === introSteps.length

    if (!isLast) {
      setIntroIndex(i => i + 1)
      return
    }

    if (!startReady) return

    setShowIntro(false)
    nav(`/level/${LEVEL_KEY}`)
  }

  // 🚀 Iniciar set JUNIOR
  const handleStart = async () => {
    if (loading) return
    setLoading(true)
    setStatus('Preparando simulación…')

    if (setId) {
      nav(`/level/${LEVEL_KEY}`)
      setLoading(false)
      return
    }

    setShowIntro(true)
    setIntroSteps([])
    setIntroIndex(0)
    setIntroError(null)
    setIntroLoading(true)
    setStartReady(false)

    try {
      const [loreResp, ctxResp] = await Promise.all([
        getLore(),
        getLevelContext(LEVEL_KEY)
      ])

      const steps: IntroStep[] = []

      const loreObj = (loreResp as any)?.lore ?? loreResp
      const loreText = extractText(loreObj)
      const loreTitle = extractTitle(loreObj) || 'Lore del mundo de Aspirante a GhostCoder'
      if (loreText) steps.push({ title: loreTitle, text: loreText })

      const ctxObj = (ctxResp as any)?.context ?? ctxResp
      const ctxText = extractText(ctxObj)
      const ctxTitle = extractTitle(ctxObj) || `Contexto del nivel: ${LEVEL_KEY}`
      if (ctxText) steps.push({ title: ctxTitle, text: ctxText })

      setIntroSteps(steps)
      setIntroLoading(false)

      startLevel(LEVEL_KEY)
        .then(async resp => {
          if (resp?.ok) {
            await bootstrap()
            setStartReady(true)
          } else {
            setIntroError('No se pudo iniciar la simulación')
          }
        })
        .catch(e => {
          console.error('Error en startLevel:', e)
          setIntroError('No se pudo iniciar la simulación')
        })
    } catch (e: any) {
      console.error('Error cargando lore/context:', e)
      setIntroError(e?.message || 'No se pudo cargar la introducción del nivel')
      setShowIntro(false)
      setStatus(`Error: ${e?.message || 'No se pudo iniciar el set o la introducción'}`)
    } finally {
      setLoading(false)
    }
  }

  // 🧹 Eliminar progreso
  const handleDeleteProgress = async () => {
    if (!setId || loading) return
    if (!window.confirm('¿Seguro que quieres eliminar tu progreso ?')) return

    setLoading(true)
    setStatus('Eliminando set en progreso…')

    try {
      await hardReset(LEVEL_KEY)
      setStatus('Progreso eliminado ✔')
    } catch {
      setStatus('Error eliminando progreso ❌')
    } finally {
      setLoading(false)
    }
  }

  const isLastStep = introIndex + 1 === introSteps.length
  const canClickContinue =
    !introLoading && !introError && (!isLastStep || startReady)

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
      src={assets.bg.inicio}
      alt="Inicio"
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        inset: 0,
        objectPosition: 'center'
      }}
    />

    {/* Status superior */}
    <div
      style={{
        position: 'absolute',
        top: 24,
        left: 0,
        right: 0,
        textAlign: 'center',
        zIndex: 2
      }}
    >
      <h2 style={{ margin: 0 }}>Inicio · Nivel Junior</h2>
      <p style={{ marginTop: 6 }}>{status}</p>
    </div>

    {/* Botonera */}
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        zIndex: 2,
        display: 'flex',
        gap: 12,
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}
    >

      {/* ✔ Comenzar nivel Junior (solo si NO hay set) */}
      {!setId && !loading && (
        <button
          onClick={handleStart}
          style={{ minWidth: 180, padding: '10px 18px' }}
        >
          Comenzar nivel Junior
        </button>
      )}

      {/* ✔ Continuar Junior solo si hay set Junior */}
      {setId && !loading && (
        <button
          onClick={() => nav(`/level/${LEVEL_KEY}`)}
          style={{ minWidth: 140, padding: '10px 18px' }}
        >
          Continuar nivel Junior
        </button>
      )}

      {/* ✔ Eliminar progreso del nivel Junior */}
      {setId && (
        <button
          onClick={handleDeleteProgress}
          style={{ minWidth: 160, padding: '10px 18px' }}
          disabled={loading}
        >
          {loading ? 'Eliminando…' : 'Eliminar progreso'}
        </button>
      )}
      
      {/* 🌟 Continuar Senior solo si EXISTE set en senior y ya terminó de cargar */}
      {hasSeniorOpen && !loadingSenior && (
        <button
          onClick={() => nav('/home/senior')}
          style={{ minWidth: 180, padding: '10px 18px' }}
        >
          Continuar nivel Senior
        </button>
      )}

    </div>

    {/* Overlay INTRO */}
    {showIntro && (
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
        aria-label="Introducción del nivel"
      >
        <div
          className="card"
          style={{
            width: 'min(980px, 94%)',
            background: 'rgba(0,0,0,0.95)',
            border: '1px solid rgba(255,255,255,.2)',
            borderRadius: 12,
            padding: 20,
            display: 'grid',
            gap: 14
          }}
        >
          {introSteps[introIndex]?.img && (
            <div
              className="card"
              style={{ overflow: 'hidden', borderRadius: 12, padding: 0 }}
            >
              <img
                src={introSteps[introIndex].img}
                alt="Escena"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          )}

          <div
            style={{
              lineHeight: 1.45,
              fontSize: '0.88rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%'
            }}
          >
            {introLoading && <p>Cargando introducción…</p>}
            {introError && (
              <p style={{ color: '#ffd3d3' }}>{introError}</p>
            )}
            {!introLoading && !introError && (
              <>
                {introSteps[introIndex]?.title && (
                  <h3
                    style={{
                      margin: '0 0 8px 0',
                      textAlign: 'center',
                      width: '100%'
                    }}
                  >
                    {introSteps[introIndex].title}
                  </h3>
                )}

                <p
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-line',
                    maxWidth: '90%',
                    textAlign: 'center'
                  }}
                >
                  {introSteps[introIndex]?.text}
                </p>

                {isLastStep && (
                  <>
                    {!startReady && (
                      <p
                        style={{
                          marginTop: 12,
                          fontSize: '0.85rem',
                          opacity: 0.9
                        }}
                      >
                        Generando simulación… espera unos segundos más.
                      </p>
                    )}

                    {startReady && (
                      <p
                        style={{
                          marginTop: 12,
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          color: '#baffc9',
                          textShadow: '0 0 4px #55ff99'
                        }}
                      >
                        ✔ Simulación completa — ¡Todo listo para continuar!
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Controles de navegación */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 6
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.9 }}>
              Escena {introIndex + 1} de {introSteps.length}
            </span>

            <div style={{ display: 'flex', gap: 8 }}>
              {!introLoading && !introError && (
                <button
                  onClick={nextIntro}
                  style={{
                    minWidth: 160,
                    padding: '10px 18px',
                    opacity: canClickContinue ? 1 : 0.6,
                    cursor: canClickContinue ? 'pointer' : 'not-allowed'
                  }}
                  disabled={!canClickContinue}
                >
                  {isLastStep ? 'Continuar' : 'Siguiente'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)

}

export default Home
