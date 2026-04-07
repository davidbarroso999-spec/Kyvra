/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Archive } from './pages/Archive';
import { Albums } from './pages/Albums';
import { AlbumDetail } from './pages/AlbumDetail';
import { Lore } from './pages/Lore';
import { Admin } from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
