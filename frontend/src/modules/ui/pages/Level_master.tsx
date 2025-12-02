// pages/Level_master.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { assets } from '@scenes/assets/assets.manifest'
import MentorStage from '@scenes/components/MentorStage'
import { useGame } from '@state/store'

import {
  getBossEligibility,
  unlockBoss
} from '@api/endpoints'

const TOTAL_ITEMS = 15
const NEEDED = 10

type Progress = {
  setId: string | null
  score: number
}

const Level_master: React.FC = () => {
  const nav = useNavigate()

  const {
    setId: storeSetId,
    completedMentors,
    bootstrap,
    hardReset
  } = useGame()

  const effectiveLevelKey = 'master'
  const effectiveSetId = storeSetId

  const [canFightBoss, setCanFightBoss] = useState(false)
  const [progress, setProgress] = useState<Progress>({ setId: null, score: 0 })
  const [msg, setMsg] = useState<string>('')

  // Overlay cuando terminaste todos los mentores pero NO desbloqueaste al Boss
  const [showFailOverlay, setShowFailOverlay] = useState(false)

  // Si entramos directo al level (o recargamos) y no hay setId, intentamos bootstrap
  useEffect(() => {
    if (!storeSetId) {
      bootstrap('master')
    }
  }, [storeSetId, bootstrap])

  // Precarga de imágenes
  useEffect(() => {
    const urls = [
      assets.bg.mentor_master,
      assets.characters.mateo,
      assets.characters.elena,
      assets.characters.haru,
      assets.characters.rebeca,
      assets.characters.victor,
      assets.characters.boss_master
    ].filter(Boolean)

    urls.forEach(src => {
      const img = new Image()
      img.src = src
    })
  }, [])

  const refreshEligibility = useCallback(async () => {
    if (!effectiveSetId) return
    try {
      const resp = await getBossEligibility(effectiveSetId)
      if (!resp?.ok) return

      const anyResp = resp as any
      const score =
        typeof anyResp.correctAny === 'number'
          ? anyResp.correctAny
          : typeof anyResp.correctRandom === 'number'
          ? anyResp.correctRandom
          : typeof anyResp.correctMain === 'number'
          ? anyResp.correctMain
          : 0

      setProgress({
        setId: effectiveSetId,
        score
      })

      const eligible = !!anyResp.eligible
      setCanFightBoss(eligible)
    } catch (e) {
      console.error('Error obteniendo elegibilidad Boss (master):', e)
    }
  }, [effectiveSetId])

  // Mensaje "No hay set activo" para que desaparezca cuando sí hay set
  useEffect(() => {
    if (!effectiveSetId) {
      setMsg('No hay un set activo. Vuelve al inicio para comenzar el nivel.')
    } else {
      setMsg(prev =>
        prev === 'No hay un set activo. Vuelve al inicio para comenzar el nivel.'
          ? ''
          : prev
      )
      // al tener setId podemos refrescar elegibilidad
      refreshEligibility()
    }
  }, [effectiveSetId, refreshEligibility])

  const handleGoBoss = async () => {
    if (!effectiveSetId) {
      setMsg('No hay un set activo. Vuelve al inicio para comenzar el nivel.')
      return
    }

    try {
      const elig = await getBossEligibility(effectiveSetId)
      if (!elig?.ok) {
        throw new Error('No se pudo verificar elegibilidad del jefe')
      }

      const anyElig = elig as any
      const currentScore =
        typeof anyElig.correctAny === 'number'
          ? anyElig.correctAny
          : typeof anyElig.correctRandom === 'number'
          ? anyElig.correctRandom
          : 0

      setProgress({
        setId: effectiveSetId,
        score: currentScore
      })

      if (!anyElig.eligible) {
        setCanFightBoss(false)
        setMsg(
          `Todavía no puedes enfrentar al jefe. Necesitas al menos ${NEEDED}/${TOTAL_ITEMS} aciertos.`
        )
        return
      }

      await unlockBoss(effectiveSetId)
      setCanFightBoss(true)
      setMsg('Jefe desbloqueado. ¡Vamos!')
      nav(`/boss/${effectiveLevelKey}`) // 👉 /boss/master
    } catch (e: any) {
      console.error('Error al ir al Boss (master):', e)
      setMsg(
        e?.message ||
          'No se pudo verificar o desbloquear al jefe. Intenta de nuevo.'
      )
    }
  }

  // Click en mentor: si ya está completado, no dejamos entrar
  const handleCharacterClick = (mentorKey: string) => {
    try {
      if (completedMentors.includes(mentorKey)) {
        setMsg(
          'Ya completaste los retos con este mentor. Elige otro o ve al Boss.'
        )
        return
      }

      if (!effectiveSetId) {
        setMsg('No hay un set activo. Vuelve al inicio para comenzar el nivel.')
        return
      }

      setMsg('Cargando reto del mentor...')
      nav(`/challenge/${effectiveLevelKey}/${mentorKey}`) // 👉 /challenge/master/:mentorKey
    } catch (e: any) {
      console.error(e)
      setMsg(e?.message || 'No se pudo cargar el reto del mentor.')
    }
  }

  const handleGoHome = async () => {
    try {
      await hardReset('master')
    } catch (e) {
      console.error('Error al hacer hardReset en Level_master:', e)
    } finally {
      nav('/home/master')
    }
  }

  // Detectar cuando el jugador terminó los 5 mentores y evaluar puntaje real en backend
  useEffect(() => {
    if (!effectiveSetId) return
    if (completedMentors.length < 5) return // todavía faltan mentores

    const run = async () => {
      try {
        const elig = await getBossEligibility(effectiveSetId)
        if (!elig?.ok) return

        const anyElig = elig as any
        const score =
          typeof anyElig.correctAny === 'number'
            ? anyElig.correctAny
            : typeof anyElig.correctRandom === 'number'
            ? anyElig.correctRandom
            : typeof anyElig.correctMain === 'number'
            ? anyElig.correctMain
            : 0

        const eligible = !!anyElig.eligible

        setProgress({
          setId: effectiveSetId,
          score
        })
        setCanFightBoss(eligible)

        if (!eligible) {
          setShowFailOverlay(true)
        } else {
          setShowFailOverlay(false)
        }
      } catch (e) {
        console.error(
          'Error evaluando elegibilidad del Boss (master) al terminar mentores:',
          e
        )
      }
    }

    run()
  }, [completedMentors.length, effectiveSetId])

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
        src={assets.bg.mentor_master}
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
          bg={assets.bg.mentor_master}
          characters={[
            { key: 'mateo',  name: 'Mateo (seguridad Global)',src: assets.characters.mateo },
            { key: 'elena',  name: 'Elena (integridad operativa)', src: assets.characters.elena },
            { key: 'haru',  name: 'Haru (ética de sistemas)',       src: assets.characters.haru },
            { key: 'rebeca',  name: 'Rebeca (Continuidad y resiliencia)', src: assets.characters.rebeca },
            { key: 'victor', name: 'Victor (infraestructura global)',src: assets.characters.victor },
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
        <img
          src={assets.characters.boss_master}
          alt="Jefe del nivel"
          style={{ width: 200, height: 200, borderRadius: 12 }}
        />
        <div className="card" style={{ background: 'rgba(0,0,0,0.70)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Sebastian, Jefe del nivel</strong>
            <span
              style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 999,
                background: canFightBoss
                  ? 'rgba(80,255,180,.15)'
                  : 'rgba(255,210,120,.15)',
                border: `1px solid ${
                  canFightBoss
                    ? 'rgba(80,255,180,.4)'
                    : 'rgba(255,210,120,.4)'
                }`
              }}
            >
              {canFightBoss ? 'Desbloqueado' : 'Bloqueado'}
            </span>
          </div>
          <div style={{ opacity: 0.9, marginTop: 4 }}>
            {canFightBoss
              ? `Listo para el Boss. Aciertos: ${progress?.score}/${TOTAL_ITEMS}`
              : `Requiere ${NEEDED}/${TOTAL_ITEMS} aciertos. Aciertos: ${
                  progress?.score ?? 0
                }/${TOTAL_ITEMS}`}
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
        <span
          style={{ fontSize: 15, textShadow: '0 1px 2px rgba(0,0,0,.5)' }}
        >
          {msg || 'Selecciona un mentor para comenzar la serie de retos.'}
        </span>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}
        >
          <button
            onClick={handleGoBoss}
            style={{ minWidth: 120, padding: '10px 18px' }}
            disabled={!progress.setId}
          >
            Ir al Boss
          </button>
          <button
            onClick={() => nav('/home/master')}
            style={{ minWidth: 120, padding: '10px 18px' }}
          >
            Volver
          </button>
          <button
            onClick={() => nav('/result/master')}
            style={{ minWidth: 120, padding: '10px 18px' }}
          >
            Ver progreso
          </button>
        </div>
      </div>

      {/* Overlay cuando terminaste todos los mentores pero NO desbloqueaste al Boss */}
      {showFailOverlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 12,
            background: 'rgba(0,0,0,.65)',
            display: 'grid',
            placeItems: 'center',
            padding: 24
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Simulación fallida"
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
                src={assets.characters.boss_master}
                alt="Sebastian, Jefe del nivel"
                style={{
                  width: 96,
                  borderRadius: 16,
                  objectFit: 'cover'
                }}
              />
              <h3 style={{ margin: 0 }}>⚠ Estado incompleto — Los mentores del equipo Kernel no autorizaron la evaluación con Sebastian.</h3>
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
              Has completado las tareas asignadas por los mentores, pero no alcanzaste el
              número mínimo de aciertos para desbloquear al jefe del nivel.
              {'\n'}
              La estación de control  y el jefe Sebastian registran inconsistencias crítica solicita reiniciar el ciclo operativo.
              Esta vez, revisa con más atención los patrones anómalos y las decisiones tomadas bajo presión.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                onClick={handleGoHome}
                style={{ minWidth: 180, padding: '10px 18px' }}
              >
                Completa las nuevas tareas asignadas 
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Level_master
