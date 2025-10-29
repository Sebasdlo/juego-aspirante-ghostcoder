import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Api } from '@api/services/Index'
import { useStore } from '@state/store'
import MentorStage from '@scenes/components/MentorStage'
import { assets } from '@scenes/assets/assets.manifest'
import { TOTAL_ITEMS, NEEDED } from '@domain/constants'

type IntroScene = {
  text: string
  img?: string
}

export default function Level() {
  React.useEffect(() => {
    document.title = 'Level | GhostCoder'
  }, [])
  const { levelKey = '' } = useParams()
  const nav = useNavigate()
  const store = useStore()
  const { progress } = store

  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Intro narrativa (secuencia de escenas)
  const [introLoading, setIntroLoading] = useState(false)
  const [introError, setIntroError] = useState<string | null>(null)
  const [introSteps, setIntroSteps] = useState<IntroScene[]>([])
  const [introIndex, setIntroIndex] = useState(0)
  const showIntro = introSteps.length > 0

  useEffect(() => {
    let alive = true
    const run = async () => {
      setIntroLoading(true)
      setIntroError(null)
      setIntroSteps([])
      setIntroIndex(0)
      try {
        const anyApi = Api as any
        if (typeof anyApi?.getLevelIntro === 'function') {
          const dto = await anyApi.getLevelIntro(levelKey)
          if (!alive) return

          // Soporte 1) Escenas múltiples desde backend: dto.scenes?: { text, img? }[]
          // Soporte 2) Fallback a un solo texto: dto.intro?: string
          const scenesFromApi: IntroScene[] = Array.isArray(dto?.scenes)
            ? (dto.scenes as any[])
                .map((s) => ({
                  text: (s?.text ?? '').toString().trim(),
                  img: (s?.img ?? '').toString().trim() || undefined,
                }))
                .filter((s) => s.text.length > 0)
            : []

          if (scenesFromApi.length > 0) {
            setIntroSteps(scenesFromApi)
          } else {
            const text = (dto?.intro ?? '').toString().trim()
            if (text) {
              // Fallback mínimo en 2-3 pasos reusando assets ya existentes
              // Paso 1: Bienvenida/contexto (texto devuelto por backend)
              // Paso 2: Escena visual del mentor/escenario
              const fallback: IntroScene[] = [
                { text },
                { text: 'Conoce a tus mentores y prepárate para los retos del nivel.', img: assets.bg.mentor },
              ]
              setIntroSteps(fallback)
            }
          }
        } else {
          // Si no existe el método en el cliente, no forzamos nada.
        }
      } catch (e: any) {
        if (!alive) return
        setIntroError(e?.message || 'No se pudo cargar la introducción del nivel.')
      } finally {
        if (!alive) return
        setIntroLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [levelKey])

  const nextIntro = () => {
    setIntroIndex((i) => {
      const next = i + 1
      if (next >= introSteps.length) {
        // Cierra la intro cuando termina la secuencia
        setIntroSteps([])
        return i
      }
      return next
    })
  }

const start = async () => {
  setLoading(true)
  try {
    const userId = 'dev'   // ⚠️ usa tu user real si lo tienes en el store
    const r = await Api.startLevel(levelKey, userId)
    const nextIndex = r.nextIndex ?? 1
    const anyStore = store as any

    if (typeof anyStore.startProgress === 'function') {
      anyStore.startProgress({ levelKey, setId: r.setId, nextIndex })
    } else if (typeof anyStore.setProgress === 'function') {
      anyStore.setProgress({ levelKey, setId: r.setId, nextIndex, score: 0 })
    } else {
      if (typeof anyStore.setNextIndex === 'function') anyStore.setNextIndex(nextIndex)
      if (typeof anyStore.setSetId === 'function') anyStore.setSetId(r.setId)
    }

    setMsg(`Set creado: ${r.setId}`)
  } catch (e: any) {
    setMsg(`Error: ${e?.message ?? 'No se pudo iniciar el nivel'}`)
  } finally {
    setLoading(false)
  }
}

  const handleCharacterClick = (key: string) => {
    const anyStore = store as any
    if (typeof anyStore.selectMentor === 'function') anyStore.selectMentor(key)
    nav(`/challenge/${levelKey}?mentor=${key}`)
  }

  const canFightBoss = (progress?.score ?? 0) >= NEEDED

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
        src={assets.bg.mentor}
        alt="Fondo Mentor"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
          objectFit: 'cover',
          objectPosition: 'center'
        }}
      />

      {/* Mentores */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        <MentorStage
          bg={assets.bg.mentor}
          characters={[
            { key: 'camila', name: 'Camila (back-end)', src: assets.characters.camila },
            { key: 'hernan', name: 'Hernán (automatización)', src: assets.characters.hernan },
            { key: 'sofia',  name: 'Sofía (soluciones)',    src: assets.characters.sofia },
            { key: 'diego',  name: 'Diego (seguridad)',      src: assets.characters.diego },
            { key: 'lucia',  name: 'Lucía (datos)',          src: assets.characters.lucia },
          ]}
          onCharacterClick={handleCharacterClick}
        />
      </div>

      {/* Jefe arriba-derecha */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          display: 'flex',
          alignItems: 'center',
          zIndex: 3,
          flexDirection: 'column'
        }}
      >
        <img src={assets.characters.boss} alt="Jefe del nivel" style={{ width: 120, height: 120, borderRadius: 12 }} />
        <div className="card" style={{ background: 'rgba(0,0,0,.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Ramírez, Jefe del nivel</strong>
            <span style={{
              fontSize: 12, padding: '2px 8px', borderRadius: 999,
              background: canFightBoss ? 'rgba(80,255,180,.15)' : 'rgba(255,210,120,.15)',
              border: `1px solid ${canFightBoss ? 'rgba(80,255,180,.4)' : 'rgba(255,210,120,.4)'}`
            }}>
              {canFightBoss ? 'Desbloqueado' : 'Bloqueado'}
            </span>
          </div>
          <div style={{ opacity: .9, marginTop: 4 }}>
            {canFightBoss
              ? `Listo para el Boss. Aciertos: ${progress?.score}/${TOTAL_ITEMS}`
              : `Requiere ${NEEDED}/${TOTAL_ITEMS} aciertos. Aciertos: ${progress?.score ?? 0}/${TOTAL_ITEMS}`}
          </div>
        </div>
      </div>

      {/* Botonera inferior */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 16,
          display: 'grid',
          justifyItems: 'center',
          gap: 8,
          zIndex: 3
        }}
      >
        <span style={{ fontSize: 15, textShadow: '0 1px 2px rgba(0,0,0,.5)' }}>
          {msg || 'Pulsa “Iniciar” para generar el set de retos.'}
        </span>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button disabled={loading} onClick={start} style={{ minWidth: 120, padding: '10px 18px' }}>
            {loading ? 'Iniciando…' : 'Iniciar'}
          </button>
          <button disabled={!progress?.setId} onClick={() => nav(`/boss/${levelKey}`)} style={{ minWidth: 120, padding: '10px 18px' }}>
            Ir al Boss
          </button>
          <button onClick={() => nav('/')} style={{ minWidth: 120, padding: '10px 18px' }}>
            Volver
          </button>
        </div>
      </div>

      {/* Overlay de INTRO en SECUENCIA (IDs 8, 18, 19) */}
      {showIntro && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', padding: 24 }}
          role="dialog"
          aria-modal="true"
          aria-label="Introducción del nivel"
        >
          <div
            className="card"
            style={{
              width: 'min(980px, 94%)',
              background: 'rgba(0,0,0,.6)',
              border: '1px solid rgba(255,255,255,.2)',
              borderRadius: 12,
              padding: 20,
              display: 'grid',
              gap: 14
            }}
          >
            {/* Imagen opcional por escena */}
            {introSteps[introIndex]?.img && (
              <div className="card" style={{ overflow: 'hidden', borderRadius: 12, padding: 0 }}>
                <img
                  src={introSteps[introIndex].img}
                  alt="Escena"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            )}

            {/* Texto de la escena */}
            <div style={{ lineHeight: 1.5 }}>
              {introLoading && <p>Cargando introducción…</p>}
              {introError && <p style={{ color: '#ffd3d3' }}>{introError}</p>}
              {!introLoading && !introError && (
                <p style={{ margin: 0 }}>{introSteps[introIndex]?.text}</p>
              )}
            </div>

            {/* Controles de escena */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 6
              }}
            >
              <span style={{ fontSize: 12, opacity: .9 }}>
                Escena {introIndex + 1} de {introSteps.length}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={nextIntro} style={{ minWidth: 160, padding: '10px 18px' }}>
                  {introIndex + 1 < introSteps.length ? 'Siguiente' : 'Continuar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
