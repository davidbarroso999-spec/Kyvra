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
      {/* Debug Marker */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 bg-primary text-void px-2 py-0.5 text-[10px] z-[10001] font-mono">
        KYVRA_V1.0_ACTIVE
      </div>
      <BackgroundEffects />
      
      <div className="noise-overlay" />
      <div className="scanlines" />
      
      {/* Scroll Progress Line */}
      <div className="fixed left-0 top-0 w-[2px] h-full bg-border z-50 hidden md:block">
        <motion.div 
          className="w-full bg-primary origin-top"
          style={{ height }}
        />
      </div>

      <Header />
      
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <MiniPlayer />
    </div>
  );
}
