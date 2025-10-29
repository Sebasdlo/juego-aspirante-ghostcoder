import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  React.useEffect(() => {
    document.title = '404 | GhostCoder'
  }, [])

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2>Página no encontrada</h2>
      <p>La ruta que intentaste abrir no existe.</p>
      <Link to="/"><button>Volver al inicio</button></Link>
    </div>
  )
}
