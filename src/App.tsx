/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { useStore } from './store/useStore';
import React, { Suspense } from 'react';
import { UltraPerformanceEngine } from './lib/performance-engine';

// Lazy loading das páginas para melhorar a performance inicial
const Home = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Archive = React.lazy(() => import('./pages/Archive').then(m => ({ default: m.Archive })));
const Albums = React.lazy(() => import('./pages/Albums').then(m => ({ default: m.Albums })));
const AlbumDetail = React.lazy(() => import('./pages/AlbumDetail').then(m => ({ default: m.AlbumDetail })));
const Lore = React.lazy(() => import('./pages/Lore').then(m => ({ default: m.Lore })));
const Admin = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));

export default function App() {
  const { theme } = useStore();

  React.useEffect(() => {
    // Apply theme to document
    document.documentElement.className = theme === 'abissal' ? '' : `theme-${theme}`;
  }, [theme]);

  React.useEffect(() => {
    console.log("Kyvra App mounted successfully.");
    if (process.env.GEMINI_API_KEY) {
      console.log("GEMINI_API_KEY is detected in the environment.");
    } else {
      console.warn("GEMINI_API_KEY is NOT detected in the environment. AI features will not work.");
    }

    // Initialize ultra performance engine
    (window as any).PerformanceEngine = new UltraPerformanceEngine({
      targetFPS: 120
    });
  }, []);

  return (
    <HashRouter>
      <Suspense fallback={<div className="flex h-[100dvh] w-full items-center justify-center bg-void text-text-low text-xs tracking-[0.2em]">CARREGANDO...</div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="arquivo" element={<Archive />} />
            <Route path="reliquias" element={<Albums />} />
            <Route path="reliquias/:id" element={<AlbumDetail />} />
            <Route path="cosmogonia" element={<Lore />} />
            <Route path="arquivista" element={<Admin />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
