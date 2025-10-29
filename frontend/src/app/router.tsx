import React, { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App'

// Carga diferida (opcional)
const Home = lazy(() => import('@ui/pages/Home'))
const Level = lazy(() => import('@ui/pages/Level'))
const Challenge = lazy(() => import('@ui/pages/Challenge'))
const Boss = lazy(() => import('@ui/pages/Boss'))
const Result = lazy(() => import('@ui/pages/Result'))
const NotFound = lazy(() => import('@ui/pages/NotFound'))

const withLoader = (el: React.ReactElement) => (
  <Suspense fallback={<div style={{ padding: 16 }}>Cargando…</div>}>{el}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: withLoader(<Home />) },
      { path: 'level/:levelKey', element: withLoader(<Level />) },
      { path: 'challenge/:levelKey', element: withLoader(<Challenge />) },
      { path: 'boss/:levelKey', element: withLoader(<Boss />) },
      { path: 'result', element: withLoader(<Result />) },
      // 👇 Ruta comodín 404
      { path: '*', element: withLoader(<NotFound />) },
    ]
  }
])
