import React from 'react';
import { useStore } from '@/store/useStore';
import { AnimatePresence, motion } from 'motion/react';

export function ShareSpinner() {
  const isGeneratingShare = useStore(state => state.isGeneratingShare);
  
  return (
    <AnimatePresence>
      {isGeneratingShare && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-void/60 backdrop-blur-md"
        >
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="mt-4 text-sm font-mono text-primary tracking-widest uppercase animate-pulse">
            Decodificando fragmento...
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
