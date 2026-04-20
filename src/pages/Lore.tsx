import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { getAI, MODELS, generateText } from '@/lib/ai';
import { Sparkles, Loader2, BookOpen, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Lore() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChapterId, setExpandedChapterId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchLore() {
      const { data, error } = await supabase
        .from('lore_chapters')
        .select('*')
        .order('chapter_number', { ascending: true });

      if (error) {
        console.error("Error fetching lore chapters:", error);
      }

      if (data) {
        setChapters(data.filter(c => c.chapter_number >= 0));
      }
      setLoading(false);
    }
    fetchLore();
  }, []);

  return (
    <div className="w-full pt-32 px-6 pb-32 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex flex-col items-center justify-center text-center"
      >
        <div className="flex items-center gap-3 text-text-high mb-2">
          <BookOpen className="text-primary" size={28} />
          <h1 className="text-2xl tracking-widest font-display uppercase shrink-0">Linha do Tempo</h1>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-primary">
          <Loader2 size={32} className="animate-spin mb-4" />
          <span className="font-sc tracking-widest text-sm">Decifrando Arquivos...</span>
        </div>
      ) : chapters.length === 0 ? (
        <div className="text-center text-text-low py-12 border border-border/50 rounded-xl bg-void/50">
          Nenhum fragmento de história foi encontrado.
        </div>
      ) : (
        <div className="flex flex-col gap-6 relative z-10 w-full mx-auto">
          {chapters.map((chapter) => {
            const isExpanded = expandedChapterId === chapter.id;

            return (
              <motion.div 
                layout
                key={chapter.id}
                onClick={() => setExpandedChapterId(isExpanded ? null : chapter.id)}
                className={cn(
                  "relative bg-void border rounded-xl p-6 cursor-pointer overflow-hidden transition-colors origin-top",
                  isExpanded ? "border-primary" : "border-border/50 hover:border-primary/50"
                )}
                style={{ borderRadius: '12px' }}
              >
                {/* Background Glow for active state */}
                {isExpanded && (
                  <motion.div
                    layoutId={`glow-${chapter.id}`}
                    className="absolute inset-0 bg-primary/[0.03] pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}

                <motion.div layout className="relative z-10 space-y-3">
                  <div className="flex flex-col gap-2">
                    <motion.div layout className="flex items-center gap-2 text-primary font-medium text-sm">
                      <Calendar size={14} className="shrink-0" />
                      <span>{chapter.timeline_date || `Capítulo ${chapter.chapter_number}`}</span>
                    </motion.div>
                    
                    <motion.h2 layout className="text-xl sm:text-2xl font-display text-text-high uppercase leading-tight font-light">
                      {chapter.title}
                    </motion.h2>
                  </div>
                  
                  {!isExpanded && (
                    <motion.p 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-text-mid text-sm leading-relaxed line-clamp-2"
                    >
                      {chapter.content}
                    </motion.p>
                  )}
                </motion.div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative z-10 mt-6"
                    >
                      {chapter.image_url && (
                        <div className="mb-6 rounded-lg overflow-hidden border border-border/50 shadow-lg">
                          <img 
                            src={chapter.image_url} 
                            alt={chapter.title}
                            className="w-full object-cover aspect-video"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <div className="prose prose-invert max-w-none">
                        <div className="space-y-6">
                          {chapter.content.split('\n\n').map((paragraph: string, pIdx: number) => (
                            <p key={pIdx} className="font-sans font-light text-base sm:text-[17px] leading-[1.9] text-text-mid whitespace-pre-line">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="mt-8 flex justify-center pb-2">
                        <button 
                          className="flex items-center justify-center p-2 rounded-full border border-border text-text-low hover:text-text-high hover:border-primary/50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedChapterId(null);
                          }}
                        >
                          <ChevronDown size={20} className="rotate-180" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
