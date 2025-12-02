// pages/FinalGame.tsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '@state/store' 
import { assets } from '@scenes/assets/assets.manifest'
import { getSummarySets } from '@api/endpoints'

const panelStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.90)',
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

type SummaryEntry = {
  setId: string
  user_id: string
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

const FinalGame: React.FC = () => {
  const nav = useNavigate()
  const { hardReset } = useGame()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<SummaryEntry[]>([])
  const [showIntro, setShowIntro] = useState(true)

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

  const renderMentorRows = (summary: SummaryEntry) => {
    const entries = Object.entries(summary.byMentor || {})
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
        <h4 style={{ margin: '0 0 4px 0' }}>Rendimiento por mentor</h4>
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
                <th style={{ textAlign: 'left', padding: '4px 6px' }}>
                  Mentor
                </th>
                <th style={{ textAlign: 'left', padding: '4px 6px' }}>
                  Rol
                </th>
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
                  m.total > 0 ? Math.round((m.correct / m.total) * 100) : 0

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

  const handleViewFinalResults = async () => {
    setShowIntro(false)
    setLoading(true)
    setError(null)

    try {
      const resp: any = await getSummarySets()

      if (!resp?.ok) {
        throw new Error('No se pudo cargar el resumen de los sets.')
      }

      const list: SummaryEntry[] = resp.summaries || []

      const order = ['junior', 'senior', 'master']
      const ordered = [...list].sort((a, b) => {
        const ia = order.indexOf(a.set.level_key)
        const ib = order.indexOf(b.set.level_key)
        return ia - ib
      })

      setSummaries(ordered)
    } catch (e: any) {
      console.error('Error cargando summarysets:', e)
      setError(e?.message || 'No se pudo cargar el resumen de los sets.')
    } finally {
      setLoading(false)
    }
  }
    const handleDeleteProgress = async () => {
    try {
      await hardReset()
    } catch (e) {
      console.error('Error al hacer hardReset en Result_master:', e)
    } finally {
      nav('/')
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
        src={assets.bg.finalGame}
        alt="Fondo Resultado Final"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
          objectFit: 'cover',
          objectPosition: 'center'
        }}
      />

      {/* Contenido en grid: igual patrón que Result_master */}
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
        {/* 🔹 Título SOLO cuando ya hay resultados (no intro, no loading, no error) */}
        {!showIntro && !loading && !error && (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <h2 style={{ margin: 0 }}>Resumen final de tu progreso</h2>
            <p style={{ margin: '4px 0', opacity: 0.9 }}>
              Junior · Senior · Master
            </p>
          </div>
        )}

        {/* Panel central */}
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center'
          }}
        >
          {/* 1) Estado de carga: panel estilo Result_master */}
          {loading && !showIntro && (
            <div
              className="card"
              style={{
                ...panelStyle,
                width: 'min(900px, 92%)'
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>
                Resultado final del juego
              </h2>
              <p style={{ margin: 0 }}>
                Cargando resumen final de los niveles…
              </p>
            </div>
          )}

          {/* 2) Error en el mismo panel */}
          {!loading && error && !showIntro && (
            <div
              className="card"
              style={{
                ...panelStyle,
                width: 'min(900px, 92%)'
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>
                Resultado final del juego
              </h2>
              <p style={{ margin: 0, color: '#ffd3d3' }}>{error}</p>
            </div>
          )}

          {/* 3) Resultado: 3 tarjetas separadas */}
          {!loading && !error && !showIntro && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 16,
                alignItems: 'flex-start',
                width: '100%',
                maxWidth: '1200px',
              }}
            >
              {summaries.length === 0 && (
                <p
                  style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    color: '#fff'
                  }}
                >
                  No se encontraron sets completados para mostrar.
                </p>
              )}

              {summaries.map(summary => {
                const { set, totals, byKind } = summary
                const levelLabel =
                  set.level_key.charAt(0).toUpperCase() +
                  set.level_key.slice(1)

                return (
                  <div
                    key={summary.setId}
                    className="card"
                    style={{
                      ...panelStyle,
                      width: '100%',
                      textAlign: 'center'
                    }}
                  >
                    <h3 style={{ marginTop: 0, marginBottom: 6 }}>
                      Resultado nivel {levelLabel}
                    </h3>

                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                      <strong>Set ID:</strong> {summary.setId}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                      <strong>Estado del nivel:</strong> {set.status}
                    </p>
                    <p
                      style={{
                        margin: '4px 0',
                        fontSize: '0.85rem',
                        opacity: 0.9
                      }}
                    >
                    </p>

                    <div style={{ marginTop: 8 }}>
                      <span
                        style={{
                          ...pillStyle,
                          borderColor: set.boss_unlocked
                            ? 'rgba(80,255,180,.8)'
                            : 'rgba(255,210,120,.8)',
                          background: set.boss_unlocked
                            ? 'rgba(80,255,180,.15)'
                            : 'rgba(255,210,120,.15)'
                        }}
                      >
                        {set.boss_unlocked
                          ? 'Boss desbloqueado'
                          : 'Boss NO desbloqueado'}
                      </span>
                    </div>

                    {/* Totales */}
                    <div style={{ marginTop: 12, fontSize: '0.9rem' }}>
                      <p style={{ margin: '2px 0' }}>
                        <strong>Retos totales:</strong>{' '}
                        {totals.totalItems}
                      </p>
                      <p style={{ margin: '2px 0' }}>
                        <strong>Contestadas:</strong> {totals.answered}
                      </p>
                      <p style={{ margin: '2px 0' }}>
                        <strong>Respuestas Correctas:</strong> {totals.correct}
                      </p>
                    </div>

                    {/* Por tipo */}
                    <div
                      style={{
                        marginTop: 10,
                        textAlign: 'left',
                        fontSize: '0.9rem'
                      }}
                    >
                      <h4 style={{ margin: '0 0 4px 0' }}>
                        Rendimiento por tipo de reto
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {renderKindLine('Main', byKind.main)}
                        {renderKindLine('Aleatorio', byKind.random)}
                        {renderKindLine('Boss', byKind.boss)}
                      </ul>
                    </div>

                    {/* Por mentor */}
                    {renderMentorRows(summary)}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Botonera inferior */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12
          }}
        >
          <button
            onClick={handleDeleteProgress}
            style={{ minWidth: 180, padding: '10px 18px' }}
          >
            Volver al inicio reiniciando el juego
          </button>
        </div>
      </div>

      {/* Overlay de FELICITACIÓN inicial */}
      {showIntro && (
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
          aria-label="Felicitación final del juego"
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
                  width: 200,
                  borderRadius: 16,
                  objectFit: 'cover'
                }}
              />
              <h3 style={{ margin: 0 }}>🏁 Has llegado al final de tu recorrido como aspirante en GhostCoder. </h3>
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
              Las palabras del Fundador resuenan en el núcleo de GhostNet, marcando un antes y un después en tu recorrido. 
              La guerra tecnológica continúa, y él ha dejado claro que estás preparado para asumir el lugar que ahora ocupas.
              {'\n'}
              Tu rol se integra al núcleo que resguarda la continuidad y la dirección estratégica de GhostNet.
              Ahora comienza tu legado como uno de los líderes de GhostCoder junto al Fundador. 
              {'\n'}
              Has terminado el juego.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12
              }}
            >
              <button onClick={handleViewFinalResults}>
                Ver resultado final del juego
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinalGame
