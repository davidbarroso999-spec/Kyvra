/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { useStore } from './store/useStore';
import React, { Suspense } from 'react';
import { Preloader } from './components/ui/Preloader';
import { CookieBanner } from './components/ui/CookieBanner';

// Lazy loading das páginas para melhorar a performance inicial
const Home = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Archive = React.lazy(() => import('./pages/Archive').then(m => ({ default: m.Archive })));
const Albums = React.lazy(() => import('./pages/Albums').then(m => ({ default: m.Albums })));
const AlbumDetail = React.lazy(() => import('./pages/AlbumDetail').then(m => ({ default: m.AlbumDetail })));
const Lore = React.lazy(() => import('./pages/Lore').then(m => ({ default: m.Lore })));
const Admin = React.lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));

export default function App() {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);

  React.useEffect(() => {
    const validThemes = ['abissal', 'sangue-de-drago', 'floresta-negra', 'monolito'];
    if (!validThemes.includes(theme)) {
      setTheme('abissal');
      return;
    }
    // Apply theme to document
    document.documentElement.className = theme === 'abissal' ? '' : `theme-${theme}`;

    // Update Android status bar / PWA theme color dynamically
    const themeColors: Record<string, string> = {
      'abissal': '#020205',
      'sangue-de-drago': '#080202',
      'floresta-negra': '#020503',
      'monolito': '#050505',
    };
    const color = themeColors[theme] || '#020205';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    }
  }, [theme, setTheme]);

  React.useEffect(() => {
    console.log("Kyvra App mounted successfully.");
    if (process.env.GEMINI_API_KEY) {
      console.log("GEMINI_API_KEY is detected in the environment.");
    } else {
      console.warn("GEMINI_API_KEY is NOT detected in the environment. AI features will not work.");
    }

    // Inicialização do Background Mode para reprodução contínua em segundo plano no Android/iOS
    const initBackgroundMode = () => {
      const bgMode = (window as any).cordova?.plugins?.backgroundMode;
      if (bgMode) {
        try {
          bgMode.enable();
          bgMode.setDefaults({
            title: 'Kyvra Player',
            text: 'Kyvra está ativo em segundo plano',
            icon: 'icon',
            color: '0d0d1a',
            resume: true,
            hidden: true,
            silent: true // Oculta a notificação padrão do background mode para priorizar os controles nativos de mídia
          });
          console.log("Kyvra: Background Mode do Capacitor ativado com sucesso.");
        } catch (e) {
          console.error("Kyvra: Erro ao configurar o Background Mode:", e);
        }
      } else {
        console.log("Kyvra: Plugin de Background Mode não detectado no ambiente Web (comum fora do APK).");
      }
    };

    document.addEventListener('deviceready', initBackgroundMode, false);
    initBackgroundMode(); // Executa caso o dispositivo já esteja pronto

    return () => {
      document.removeEventListener('deviceready', initBackgroundMode);
    };
  }, []);

  return (
    <HashRouter>
      <Preloader />
      <CookieBanner />
      <Suspense fallback={null}>
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
