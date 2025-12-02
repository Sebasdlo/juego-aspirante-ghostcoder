// pages/Result_master.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { assets } from '@scenes/assets/assets.manifest'
import { useGame } from '@state/store'
import { getSetSummary } from '@api/endpoints'

const panelStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,.55)',
  border: '1px solid rgba(255,255,255,.22)',
  padding: 16,
  borderRadius: 12,
  color: '#fff'
}

const pillStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 12,
  border: '1px solid rgba(255,255,255,.4)',
  background: 'rgba(0,0,0,.35)'
}

type RouteParams = {
  levelKey?: string
}

type Totals = {
  answered: number
  correct: number
  totalItems: number
}

type KindStats = {
  total: number
  correct: number
}

type MentorStats = {
  name: string
  role: string
  total: number
  correct: number
}

type SummaryData = {
  set: {
    level_key: string
    status: string
    next_index: number
    created_at: string
    updated_at: string
    boss_unlocked: boolean
  }
  totals: Totals
  byKind: {
    main?: KindStats
    random?: KindStats
    boss?: KindStats
  }
  byMentor: Record<string, MentorStats>
}

const Result_master: React.FC = () => {
  const nav = useNavigate()
  const params = useParams<RouteParams>()

  const { setId, level: storeLevel, hardReset, bootstrap } = useGame()
  // 👇 Para esta pantalla asumimos 'master' como default
  const urlLevelKey = params.levelKey || 'master'
  const levelKey = storeLevel || urlLevelKey

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SummaryData | null>(null)

  // Cargar resumen del set de forma segura (sin actualizar si se desmonta)
// 👇 Esto garantiza que bootstrap SIEMPRE se ejecute cuando entras o recargas
useEffect(() => {
  ;(async () => {
    try {
      await bootstrap('master')
    } catch (e) {
      console.error("Error en bootstrap inicial:", e)
    }
  })()
}, [])
useEffect(() => {
  if (!setId) {
    setError('No hay un set activo. Espera unos segundos…')
    setData(null)
    return
  }

  let cancelled = false

  const load = async () => {
    setLoading(true)
    setError(null)

    try {
      const resp: any = await getSetSummary(setId)

      if (!resp?.ok) {
        throw new Error('No se pudo cargar el resumen del set.')
      }

      const payload = resp.summary ?? resp

      if (!cancelled) {
        setData({
          set: payload.set,
          totals: payload.totals,
          byKind: payload.byKind || {},
          byMentor: payload.byMentor || {}
        })
      }
    } catch (e: any) {
      console.error('Error cargando resumen del set (master):', e)
      if (!cancelled) {
        setError(e?.message || 'No se pudo cargar el resumen del set.')
      }
    } finally {
      if (!cancelled) {
        setLoading(false)
      }
    }
  }

  load()

  return () => {
    cancelled = true
  }
}, [setId])

  const renderKindLine = (label: string, stats?: KindStats) => {
    if (!stats) return null
    const { total, correct } = stats
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0

    return (
      <li key={label}>
        <strong>{label}:</strong> {correct}/{total} ({pct}%)
      </li>
    )
  }

  const renderMentorRows = () => {
    if (!data) return null

    const entries = Object.entries(data.byMentor || {})
    if (entries.length === 0) return null

    const sorted = entries.sort(([, a], [, b]) =>
      a.name.localeCompare(b.name, 'es')
    )

    return (
      <div
        style={{
          marginTop: 16,
          textAlign: 'left',
          fontSize: '0.9rem'
        }}
      >
        <h3 style={{ margin: '0 0 6px 0' }}>Rendimiento por mentor</h3>
        <div
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,.15)',
            padding: 8,
            background: 'rgba(0,0,0,.25)'
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem'
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '4px 6px' }}>Mentor</th>
                <th style={{ textAlign: 'left', padding: '4px 6px' }}>Rol</th>
                <th style={{ textAlign: 'center', padding: '4px 6px' }}>
                  Correctas / Total
                </th>
                <th style={{ textAlign: 'center', padding: '4px 6px' }}>
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(([id, m]) => {
                const pct =
                  m.total > 0
                    ? Math.round((m.correct / m.total) * 100)
                    : 0

                return (
                  <tr key={id}>
                    <td style={{ padding: '4px 6px' }}>{m.name}</td>
                    <td style={{ padding: '4px 6px', opacity: 0.85 }}>
                      {m.role}
                    </td>
                    <td
                      style={{
                        padding: '4px 6px',
                        textAlign: 'center'
                      }}
                    >
                      {m.correct}/{m.total}
                    </td>
                    <td
                      style={{
                        padding: '4px 6px',
                        textAlign: 'center'
                      }}
                    >
                      {pct}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // 🔁 Eliminar progreso del nivel master y volver al Home_master
  const handleDeleteProgress = async () => {
    try {
      await hardReset('master')
    } catch (e) {
      console.error('Error al hacer hardReset en Result_master:', e)
    } finally {
      nav('/home/master')
    }
  }

  const handleBackToLevel = () => {
    nav(`/level/${levelKey || 'master'}`)
  }
  // ✅ Nuevo: pasar a nivel master cuando next_index === 21
  const canGoTomaster =
    !loading &&
    !error &&
    data &&
    data.set &&
    data.set.level_key === 'master' &&
    data.set.next_index === 21

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
        src={assets.bg.resultado_master}
        alt="Fondo Resultado master"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
          objectFit: 'cover',
          objectPosition: 'center'
        }}
      />

      {/* Contenido en grid: centro + botonera abajo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateRows: '1fr auto',
          gap: 16,
          padding: 24,
          zIndex: 2
        }}
      >
        {/* Panel central */}
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center'
          }}
        >
          <div
            className="card"
            style={{
              ...panelStyle,
              width: 'min(900px, 92%)'
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>
              Resultado del nivel master
            </h2>

            {loading && (
              <p style={{ margin: 0 }}>Cargando resumen del set…</p>
            )}

            {!loading && error && (
              <p style={{ margin: 0, color: '#ffd3d3' }}>
                {error}
              </p>
            )}

            {!loading && !error && setId && data && (
              <>
                {/* Datos básicos del set */}
                <p style={{ margin: '6px 0' }}>
                  <strong>Nivel:</strong> {data.set.level_key || levelKey}
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>Set ID:</strong> {setId}
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>Estado del set:</strong> {data.set.status}
                </p>
                <p
                  style={{
                    margin: '6px 0',
                    fontSize: '0.9rem',
                    opacity: 0.9
                  }}
                >
                  <strong>Último índice (next_index):</strong>{' '}
                  {data.set.next_index}
                </p>

                <div style={{ marginTop: 10 }}>
                  <span
                    style={{
                      ...pillStyle,
                      borderColor: data.set.boss_unlocked
                        ? 'rgba(80,255,180,.8)'
                        : 'rgba(255,210,120,.8)',
                      background: data.set.boss_unlocked
                        ? 'rgba(80,255,180,.15)'
                        : 'rgba(255,210,120,.15)'
                    }}
                  >
                    {data.set.boss_unlocked
                      ? 'Boss desbloqueado'
                      : 'Boss NO desbloqueado'}
                  </span>
                </div>

                {/* Totales generales */}
                <div style={{ marginTop: 14 }}>
                  <h3 style={{ margin: '0 0 6px 0' }}>Totales del set</h3>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Retos totales:</strong>{' '}
                    {data.totals.totalItems}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>contestadas:</strong>{' '}
                    {data.totals.answered}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Respuestas correctas:</strong>{' '}
                    {data.totals.correct}
                  </p>
                </div>

                {/* Por tipo de reto (main / random / boss) */}
                <div
                  style={{
                    marginTop: 14,
                    textAlign: 'left',
                    fontSize: '0.9rem'
                  }}
                >
                  <h3 style={{ margin: '0 0 6px 0' }}>
                    Rendimiento por tipo de reto
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {renderKindLine('Main', data.byKind.main)}
                    {renderKindLine('Aleatorio', data.byKind.random)}
                    {renderKindLine('Boss', data.byKind.boss)}
                  </ul>
                </div>

                {/* 🔹 Rendimiento por mentor */}
                {renderMentorRows()}
              </>
            )}
          </div>
        </div>

        {/* Botonera inferior */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12
          }}
        >
          {/* 🔥 Eliminar progreso del nivel master */}
          <button
            onClick={handleDeleteProgress}
            style={{
              minWidth: 200,
              padding: '10px 18px',
              background: '#8b0000',
              color: 'white'
            }}
          >
            Eliminar progreso del nivel
          </button>

          {/* 🔙 Volver al inicio SIN borrar progreso */}
          <button
            onClick={() => nav('/home/master')}
            style={{ minWidth: 160, padding: '10px 18px' }}
          >
            Volver al inicio
          </button>

          {/* 🔁 Volver al nivel master */}
          <button
            onClick={handleBackToLevel}
            style={{ minWidth: 160, padding: '10px 18px' }}
          >
            Volver al nivel
          </button>
                    {/* 🆙 Siguiente nivel: master (solo cuando next_index === 21 en junior) */}
          {canGoTomaster && (
            <button
              onClick={() => nav('/finalgame')}
              style={{ minWidth: 200, padding: '10px 18px' }}
            >
              ver el final del juego
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Result_master
