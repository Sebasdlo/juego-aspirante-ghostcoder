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
// Nuevas páginas Senior
const Home_senior = lazy(() => import('@ui/pages/Home_senior'))
const Level_senior = lazy(() => import('@ui/pages/Level_senior'))
const Challenge_senior = lazy(() => import('@ui/pages/Challenge_senior'))
const Boss_senior = lazy(() => import('@ui/pages/Boss_senior'))
const Result_senior = lazy(() => import('@ui/pages/Result_senior'))

// Nuevas páginas master
const Home_master = lazy(() => import('@ui/pages/Home_master'))
const Level_master = lazy(() => import('@ui/pages/Level_master'))
const Challenge_master = lazy(() => import('@ui/pages/Challenge_master'))
const Boss_master = lazy(() => import('@ui/pages/Boss_master'))
const Result_master = lazy(() => import('@ui/pages/Result_master'))
const FinalGame = lazy(() => import('@ui/pages/FinalGame'))

const withLoader = (el: React.ReactElement) => (
  <Suspense fallback={<div style={{ padding: 16 }}>Cargando…</div>}>{el}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      // ------------------------------
      // 🟦 JUNIOR
      // ------------------------------
      { index: true, element: withLoader(<Home />) },

      { path: 'level/junior', element: withLoader(<Level />) },
      { path: 'challenge/junior', element: withLoader(<Challenge />) },
      { path: 'challenge/junior/:mentorKey', element: withLoader(<Challenge />) },
      { path: 'boss/junior', element: withLoader(<Boss />) },
      { path: 'result', element: withLoader(<Result />) },

      // ------------------------------
      // 🟧 SENIOR (Nuevas páginas)
      // ------------------------------
      { path: 'level/senior', element: withLoader(<Level_senior />) },
      { path: 'home/senior', element: withLoader(<Home_senior />) },
      { path: 'challenge/senior', element: withLoader(<Challenge_senior />) },
      { path: 'challenge/senior/:mentorKey', element: withLoader(<Challenge_senior />) },
      { path: 'boss/senior', element: withLoader(<Boss_senior />) },
      { path: 'result/senior', element: withLoader(<Result_senior />) },

      // ------------------------------
      // 🟧 master (Nuevas páginas)
      // ------------------------------
      { path: 'level/master', element: withLoader(<Level_master />) },
      { path: 'home/master', element: withLoader(<Home_master />) },
      { path: 'challenge/master', element: withLoader(<Challenge_master />) },
      { path: 'challenge/master/:mentorKey', element: withLoader(<Challenge_master />) },
      { path: 'boss/master', element: withLoader(<Boss_master />) },
      { path: 'result/master', element: withLoader(<Result_master />) },
      { path: '/finalgame', element: withLoader(<FinalGame />)},

      // ------------------------------
      // ❌ 404
      // ------------------------------
      { path: '*', element: withLoader(<NotFound />) },
    ],
  },
])
