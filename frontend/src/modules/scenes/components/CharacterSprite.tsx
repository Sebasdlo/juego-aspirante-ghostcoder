import React from 'react'

export default function CharacterSprite({
  name, x, y, src
}: { name: string; x: number; y: number; src: string }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)' }}>
      <img src={src} alt={name} style={{ width: 96, height: 96, borderRadius: 12 }} />
      <div style={{
        marginTop: 6, textAlign: 'center', fontSize: 12, opacity: .9,
        background: 'rgba(0,0,0,.35)', borderRadius: 6, padding: '2px 6px'
      }}>
        {name}
      </div>
    </div>
  )
}
