import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@state/store'
import { assets } from '@scenes/assets/assets.manifest'
import { Api } from '@api/services/Index'
import { TOTAL_ITEMS, NEEDED } from '@domain/constants'


type ProgressDTO = {
  levelKey?: string | null
  setId?: string | null
  score?: number | null
  nextIndex?: number | null
}

export default function Result() {
  React.useEffect(() => {
    document.title = 'Resultado | GhostCoder'
  }, [])
  const nav = useNavigate()
  const store = useStore()
  const { progress } = store

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverProgress, setServerProgress] = useState<ProgressDTO | null>(null)

  // Intento opcional de hidratar desde /api/progress (si existe)
  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const anyApi = Api as any
        if (typeof anyApi?.progress === 'function') {
          const dto = await anyApi.progress()
          if (!alive) return
          setServerProgress(dto ?? null)
        }
      } catch (e: any) {
        if (!alive) return
        // No es crítico; sólo dejamos el store.
        setError(null)
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }
    run()
    return () => { alive = false }
  }, [])

  // Preferencia: datos del servidor si los hay; si no, store
  const levelKey = (serverProgress?.levelKey ?? progress?.levelKey) || '—'
  const setId    = (serverProgress?.setId    ?? progress?.setId)    || '—'
  const scoreRaw = (serverProgress?.score ?? progress?.score) ?? 0
  const score    = Math.max(0, Math.min(TOTAL_ITEMS, scoreRaw))
  const eligible = score >= NEEDED

  const panelStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.28)',
    border: '1px solid rgba(255,255,255,.14)',
    borderRadius: 12,
    padding: '16px 18px',
    boxShadow: '0 8px 24px rgba(0,0,0,.25)',
    backdropFilter: 'blur(1px)',
    color: '#fff'
  }

  const pillStyle: React.CSSProperties = {
    fontSize: 14,
    padding: '4px 10px',
    borderRadius: 999,
    background: eligible ? 'rgba(80, 255, 180, .15)' : 'rgba(255, 210, 120, .15)',
    border: `1px solid ${eligible ? 'rgba(80,255,180,.4)' : 'rgba(255,210,120,.4)'}`
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
        src={assets.bg.resultado}
        alt="Fondo Resultado"
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
        <div style={{ display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div className="card" style={{ ...panelStyle, width: 'min(900px, 92%)' }}>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Resultado</h2>

            {loading && <p style={{ margin: 0 }}>Cargando progreso…</p>}
            {!loading && error && (
              <p style={{ margin: 0, color: '#ffd3d3' }}>No se pudo cargar el progreso.</p>
            )}

            {!loading && !error && (
              <>
                <p style={{ margin: '6px 0' }}>
                  <strong>Nivel:</strong> {levelKey}
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>Set:</strong> {setId}
                </p>
                <p style={{ margin: '6px 0' }}>
                  <strong>Puntaje:</strong> {score}/{TOTAL_ITEMS}
                </p>

                <div style={{ marginTop: 10 }}>
                  <span style={pillStyle}>
                    {eligible ? 'Requisito para Boss alcanzado' : `Requiere ${NEEDED}/${TOTAL_ITEMS} aciertos`}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Botonera inferior */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <button onClick={() => nav('/')} style={{ minWidth: 160, padding: '10px 18px' }}>
            Volver al inicio
          </button>
          <button onClick={() => nav(`/level/${levelKey}`)} style={{ minWidth: 160, padding: '10px 18px' }}>
            Volver al nivel
          </button>
        </div>
      </div>
    </div>
  )
}
