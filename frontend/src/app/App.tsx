import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'

export default function App() {
  const linkStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 8,
    textDecoration: 'none'
  }

  const activeStyle: React.CSSProperties = {
    ...linkStyle,
    background: 'rgba(255,255,255,.12)',
    border: '1px solid rgba(255,255,255,.2)'
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
      {/* Header translúcido, pegajoso arriba */}
      <header
        className="card"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backdropFilter: 'blur(6px)',
          background: 'rgba(0,0,0,.35)',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 12,
          margin: '12px auto 0',
          padding: '10px 14px',
          width: 'min(1200px, 96%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, letterSpacing: .3 }}>Aspirante a GhostCoder</h1>

        <nav aria-label="Principal" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <NavLink to="/" end
            style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
            Inicio
          </NavLink>
          <NavLink to="/level/junior"
            style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
            Level
          </NavLink>
          <NavLink to="/boss/junior"
            style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
            Boss
          </NavLink>
          <NavLink to="/result"
            style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>
            Resultado
          </NavLink>
        </nav>
      </header>

      {/* Contenido principal centrado */}
      <main id="main" style={{ padding: '16px 0' }}>
        <div style={{ width: 'min(1400px, 96%)', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>

      {/* Footer discreto */}
      <footer style={{ padding: '10px 0 18px', opacity: .7, textAlign: 'center' }}>
        v0.1 · MVP Frontend
      </footer>
    </div>
  )
}
