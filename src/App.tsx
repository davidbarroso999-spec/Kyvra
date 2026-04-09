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
import React, { Component, ErrorInfo, ReactNode } from 'react';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-void flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-4xl font-display text-primary mb-4">Algo deu errado</h1>
          <p className="text-text-mid mb-8 max-w-md">
            As brumas de Kyvra obscureceram a visão. Ocorreu um erro inesperado ao carregar a página.
          </p>
          <pre className="bg-surface p-4 rounded border border-border text-xs text-red-400 overflow-auto max-w-full mb-8">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-void rounded font-medium"
          >
            Recarregar Arquivo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
