/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Archive } from './pages/Archive';
import { Albums } from './pages/Albums';
import { AlbumDetail } from './pages/AlbumDetail';
import { Lore } from './pages/Lore';
import { Admin } from './pages/Admin';
import { useStore } from './store/useStore';
import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function App() {
  const { theme } = useStore();

  useEffect(() => {
    async function requestNotificationPermission() {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
      } catch (e) {
        // Plugin não disponível — sem problema, prossegue normalmente
      }
    }
    requestNotificationPermission();
  }, []);

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
  }, []);

  return (
    <HashRouter>
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
    </HashRouter>
  );
}
