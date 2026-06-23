import { Outlet, useLocation } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { BackgroundEffects } from '../ui/BackgroundEffects';
import { Header } from './Header';
import { Footer } from './Footer';
import { MiniPlayer } from '../ui/MiniPlayer';
import { CircularMenu } from '../ui/CircularMenu';
import { cn } from '@/lib/utils';

export function Layout() {
  const { scrollYProgress } = useScroll();
  const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const location = useLocation();
  const isLorePage = location.pathname === '/cosmogonia';

  return (
    <div className="min-h-screen flex flex-col relative w-full">
      <BackgroundEffects />
      
      <Header />
      
      <main className={cn("flex-1 flex flex-col w-full", isLorePage ? "pb-0 h-[100dvh] overflow-hidden" : "pb-32 sm:pb-24")}>
        <Outlet />
      </main>

      {!isLorePage && <Footer />}

      <CircularMenu />
      <MiniPlayer />
    </div>
  );
}
