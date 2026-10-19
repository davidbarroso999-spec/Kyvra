import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import React, { useEffect } from 'react';
import { BackgroundEffects } from '../ui/BackgroundEffects';
import { Header } from './Header';
import { Footer } from './Footer';
import { ThemeDock } from './ThemeDock';
import { MiniPlayer } from '../ui/MiniPlayer';
import { CircularMenu } from '../ui/CircularMenu';
import { cn } from '@/lib/utils';
import { recordVisit } from '@/lib/analytics';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    recordVisit(location.pathname);
  }, [location.pathname]);

  // Se o usuário abrir um link de música (?track=...) fora do acervo ou álbum, vai direto para o acervo
  useEffect(() => {
    const rawSearch = window.location.search || '';
    const hash = window.location.hash || '';
    const hashSearch = hash.includes('?') ? hash.substring(hash.indexOf('?')) : '';
    const params = new URLSearchParams(rawSearch || hashSearch || location.search);
    const trackParam = params.get('track');

    if (trackParam && location.pathname !== '/arquivo' && !location.pathname.startsWith('/reliquias/')) {
      navigate(`/arquivo?track=${encodeURIComponent(trackParam)}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  // '/cosmogonia' continua travada em tela única (comportamento original).
  // '/reliquias' (Albums) precisa de scroll para o scrubbing, mas com pb-0
  // para que o final da rolagem coincida exatamente com o fim do vídeo sem mover a imagem.
  const isClippedFullScreenPage = location.pathname === '/cosmogonia';
  const isAlbumsPage = location.pathname === '/reliquias';
  const hideFooter = location.pathname === '/cosmogonia' || location.pathname === '/reliquias';

  return (
    <div className="min-h-screen flex flex-col relative w-full">
      <BackgroundEffects />
      
      <Header />
      
      <main className={cn(
        "flex-1 flex flex-col w-full", 
        isClippedFullScreenPage ? "pb-0 h-[100dvh] overflow-hidden" : isAlbumsPage ? "pb-0" : "pb-32 sm:pb-24"
      )}>
        <Outlet />
      </main>

      {!hideFooter && <Footer />}

      <ThemeDock />
      <CircularMenu />
      <MiniPlayer />
    </div>
  );
}
