import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@state/store'
import { Api } from '@api/services/Index'
import { assets } from '@scenes/assets/assets.manifest'

export default function Home() {
  React.useEffect(() => {
    document.title = 'Inicio | GhostCoder'
  }, [])

  const nav = useNavigate()
  const { progress, reset } = useStore()
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    Api.health()
      .then(h => setStatus(`✅ API: ${h.service} @ ${new Date(h.ts).toLocaleString()}`))
      .catch(() => setStatus('⚠️ API no disponible'))
  }, [])

  // 🔴 NUEVO: elimina progreso en backend y luego resetea store
  const handleDeleteProgress = async () => {
    try {
      await Api.deleteProgress('dev') // usa tu userId real si corresponde
      reset()
      alert('✅ Progreso eliminado')
      setStatus(prev => prev || '✅ API: backend') // opcional, mantiene el banner
    } catch (e) {
      console.error(e)
      alert('❌ Error al eliminar el progreso')
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
      {/* Fondo SIN recorte */}
      <img
        src={assets.bg.inicio}
        alt="Inicio"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
          objectPosition: 'center',
          background: 'rgba(0,0,0,.2)'
        }}
      />

      {/* Status arriba (no tapa nada importante) */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 2,
          padding: '0 16px',
          textShadow: '0 1px 2px rgba(0,0,0,.5)'
        }}
      >
        <h2 style={{ margin: 0 }}>Inicio</h2>
        <p style={{ marginTop: 6 }}>{status || 'Comprobando API…'}</p>
      </div>

      {/* Botones ABAJO centrados */}
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
        {/* Mostrar Comenzar solo si NO hay progreso */}
        {!progress.setId && (
          <button
            onClick={() => nav('/level/junior')}
            style={{ minWidth: 140, padding: '10px 18px' }}
          >
            Comenzar (Junior)
          </button>
        )}

        {/* Mostrar Continuar solo si hay progreso */}
        {progress.setId && (
          <button
            onClick={() => nav(`/level/${progress.levelKey}`)}
            style={{ minWidth: 140, padding: '10px 18px' }}
          >
            Continuar
          </button>
        )}

        {/* Mostrar Eliminar progreso solo si hay progreso */}
        {progress.setId && (
          <button
            onClick={handleDeleteProgress}
            style={{ minWidth: 160, padding: '10px 18px' }}
          >
            Eliminar progreso
          </button>
        )}
      </div>
    </div>
  )
}
