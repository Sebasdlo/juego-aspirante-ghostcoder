import React, { useMemo } from 'react'

type CharacterInfo = {
  key: string
  name: string
  src: string
}

type Props = {
  bg: string
  characters: CharacterInfo[]   // hasta 5
  width?: number
  onCharacterClick?: (key: string) => void
}

/**
 * Escenario del mentor.
 * - Usa backgroundSize: 'contain' para NO recortar la imagen.
 * - Los personajes se colocan por porcentajes y son clickeables / accesibles.
 */
export default function MentorStage({
  bg,
  characters,
  width = 960,
  onCharacterClick
}: Props) {
  const layout = useMemo(() => {
    const W = 1000, H = 600
    return {
      baseW: W, baseH: H,
      spots: [
        { x: W * 0.50, y: H * 0.68 }, // centro
        { x: W * 0.20, y: H * 0.62 }, // izquierda
        { x: W * 0.80, y: H * 0.62 }, // derecha
        { x: W * 0.35, y: H * 0.48 }, // arriba-izq
        { x: W * 0.65, y: H * 0.48 }, // arriba-der
      ]
    }
  }, [])

  const containerStyle: React.CSSProperties = {
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 16,
    overflow: 'hidden',
  }

  const stageStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'contain',     // 👈 NO RECORTA
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    // para que se vea algo en los bordes si sobra espacio
    backgroundColor: 'rgba(0,0,0,0.15)',
  }

  const toPerc = (x: number, y: number) => ({
    left: `${(x / layout.baseW) * 100}%`,
    top: `${(y / layout.baseH) * 100}%`,
  })

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>, key: string) => {
    if (!onCharacterClick) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onCharacterClick(key)
    }
  }

  return (
    <div style={containerStyle}>
      {/* Fondo del escenario */}
      <div style={stageStyle} />

      {/* Personajes */}
      {characters.slice(0, 5).map((c, i) => {
        const spot = layout.spots[i] || layout.spots[0]
        const pos = toPerc(spot.x, spot.y)
        const clickable = Boolean(onCharacterClick)
        return (
          <div
            key={c.key}
            style={{
              position: 'absolute',
              ...pos,
              transform: 'translate(-50%, -50%)',
              cursor: clickable ? 'pointer' : 'default',
              userSelect: 'none',
              zIndex: 2
            }}
            onClick={() => onCharacterClick?.(c.key)}
            onKeyDown={(e) => handleKey(e, c.key)}
            role={clickable ? 'button' as const : undefined}
            tabIndex={clickable ? 0 : -1}
            title={c.name}
            aria-label={c.name}
          >
            <img
              src={c.src}
              alt={c.name}
              style={{ width: 200, height: 200, borderRadius: 12, objectFit: 'contain' }}
              draggable={false}
            />
            <div style={{
              marginTop: 6,
              fontSize: 12,
              textAlign: 'center',
              padding: '2px 8px',
              borderRadius: 8,
              background: 'rgba(0,0,0,.35)',
              border: '1px solid rgba(255,255,255,.12)'
            }}>
              {c.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}
