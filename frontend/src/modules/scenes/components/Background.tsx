import React from 'react'
export default function Background({ src, alt = 'bg' }: { src: string; alt?: string }) {
  return (
    <div className="card" style={{ overflow: 'hidden', borderRadius: 16 }}>
      <img src={src} alt={alt} style={{ width: '100%', display: 'block' }} />
    </div>
  )
}
