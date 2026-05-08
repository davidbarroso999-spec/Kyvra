import { Outlet } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { BackgroundEffects } from '../ui/BackgroundEffects';
import { Header } from './Header';
import { MiniPlayer } from '../ui/MiniPlayer';
import { CircularMenu } from '../ui/CircularMenu';

export function Layout() {
  const { scrollYProgress } = useScroll();
  const height = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div className="min-h-screen flex flex-col relative">
      <BackgroundEffects />
      
      <Header />
      
      <main className="flex-1 flex flex-col pb-32 sm:pb-24">
        <Outlet />
      </main>

      <CircularMenu />
      <MiniPlayer />
    </div>
  );
}
