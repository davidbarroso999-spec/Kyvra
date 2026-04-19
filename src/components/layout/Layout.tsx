import { Outlet } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { BackgroundEffects } from '../ui/BackgroundEffects';
import { Header } from './Header';
import { MiniPlayer } from '../ui/MiniPlayer';

export function Layout() {
  const { scrollYProgress } = useScroll();
  const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div className="min-h-screen flex flex-col relative">
      <BackgroundEffects />
      
      <div className="noise-overlay" />
      <div className="scanlines" />
      
      <Header />
      
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <MiniPlayer />
    </div>
  );
}
