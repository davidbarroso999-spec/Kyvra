import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getLoreChapters } from '@/lib/apiCache';
import { getAI, MODELS, generateText } from '@/lib/ai';
import { Sparkles, Loader2, BookOpen, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Lore() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchLore() {
      const { data, error } = await getLoreChapters();

      if (error) {
        console.error("Error fetching lore chapters:", error);
      }

      if (data) {
        setChapters(data.filter((c: any) => c.title && !c.title.startsWith('__')));
      }
      setLoading(false);
    }
    fetchLore();
  }, []);

  const toggleChapter = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Wait for animation to start, then scroll
      setTimeout(() => {
        const el = document.getElementById(`chapter-${id}`);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150);
    }
  };

  return (
    <div className="w-full pt-32 px-6 pb-40">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 md:mb-24"
        >
          <span className="label-micro text-primary block mb-4">CRÔNICAS DE KYVRA</span>
          <h1 className="text-4xl md:text-7xl font-display tracking-tight text-text-high">
            A Cosmogonia do Abismo
          </h1>
          <p className="mt-6 text-text-mid font-sans font-light max-w-2xl text-lg leading-relaxed">
            "Para entender o som, é preciso primeiro compreender o silêncio que o precede. Aqui residem as memórias do que fomos antes de sermos música."
          </p>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 text-primary">
            <Loader2 size={40} className="animate-spin mb-6 opacity-50" />
            <span className="label-micro animate-pulse">Sincronizando Fragmentos de Tempo...</span>
          </div>
        ) : chapters.length === 0 ? (
          <div className="text-center text-text-low py-20 glass r-md border-dashed border-border/40">
            Nenhuma memória foi recuperada do arquivo central.
          </div>
        ) : (
          <div className="flex flex-col w-full gap-6 pb-10">
            {chapters.map((chapter, index) => {
              const isExpanded = expandedId === chapter.id;

              return (
                <motion.div
                  key={chapter.id}
                  id={`chapter-${chapter.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  layout
                  className={cn(
                    "group relative overflow-hidden r-md flex flex-col",
                    isExpanded 
                      ? "shadow-[0_8px_30px_rgba(0,0,0,0.5)] cursor-default glass-premium" 
                      : "min-h-[140px] lg:min-h-[180px] glass hover:border-primary/40 shadow-sm cursor-pointer"
                  )}
                  onClick={() => !isExpanded && toggleChapter(chapter.id)}
                >
                  {/* Image Background */}
                  {chapter.image_url && (
                    <div className={cn(
                      "absolute inset-0 z-0 transition-opacity duration-700",
                      isExpanded ? "opacity-10" : "opacity-30 group-hover:opacity-50"
                    )}>
                      <img 
                        src={chapter.image_url} 
                        alt={chapter.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-700",
                          isExpanded ? "scale-105" : "scale-105 group-hover:scale-100"
                        )}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-void/20" />
                    </div>
                  )}

                  {/* Header Content Overlay */}
                  <div className={cn(
                    "relative z-10 w-full p-6 lg:p-10 flex flex-col",
                    isExpanded ? "items-center text-center pb-0" : "h-full justify-end"
                  )}>
                    
                    <div 
                      className={cn(
                        "flex w-full relative",
                        isExpanded 
                          ? "flex-col items-center cursor-pointer group/header hover:opacity-80" 
                          : "flex-col md:flex-row items-start md:items-end justify-start gap-2 md:gap-6 mt-auto"
                      )}
                      onClick={(e) => {
                        if (isExpanded) {
                          e.stopPropagation();
                          toggleChapter(chapter.id);
                        }
                      }}
                    >
                      <motion.span 
                        layout="position"
                        className={cn(
                          "label-micro tracking-[0.3em] shrink-0",
                          isExpanded ? "text-primary text-sm mb-4" : "text-accent group-hover:text-primary transition-colors"
                        )}
                      >
                        {chapter.chapter_number || index + 1}
                      </motion.span>

                      <motion.h2 
                        layout="position"
                        className={cn(
                          "font-display leading-[1.1] tracking-tight text-text-high m-0 [text-wrap:balance]",
                          isExpanded 
                            ? "text-4xl md:text-5xl lg:text-7xl max-w-4xl mx-auto" 
                            : "text-2xl md:text-3xl lg:text-4xl lg:w-full line-clamp-2 text-left"
                        )}
                      >
                        {chapter.title}
                      </motion.h2>
                    </div>
                  </div>

                  {/* Expanded Content with AnimatePresence */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10 overflow-hidden w-full"
                      >
                        <div className="w-full max-w-5xl mx-auto px-6 lg:px-10 pb-12 pt-8 flex flex-col items-center">
                          <div className="h-[1px] w-12 bg-primary/40 mb-10 mx-auto" />
                          
                          <div className="flex flex-col gap-10 lg:gap-16 w-full items-center">
                            {chapter.image_url && (
                              <div className="w-full relative flex justify-center">
                                <motion.div
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.2, duration: 0.6 }}
                                  className="w-full"
                                >
                                  <img 
                                    src={chapter.image_url} 
                                    alt={chapter.title}
                                    loading="lazy"
                                    decoding="async"
                                    referrerPolicy="no-referrer" 
                                    className="w-full h-auto max-h-[65vh] object-contain object-center r-md shadow-[0_40px_80px_rgba(0,0,0,0.6)] border border-border/10"
                                  />
                                </motion.div>
                              </div>
                            )}

                            <div className="w-full max-w-3xl prose prose-invert text-left">
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-8"
                              >
                                {chapter.content.split('\n\n').map((para: string, i: number) => (
                                  <p key={i} className="font-sans font-light text-text-mid text-lg md:text-xl md:text-center lg:text-left leading-relaxed opacity-90 first-letter:text-4xl first-letter:font-display first-letter:text-primary first-letter:mr-2">
                                    {para}
                                  </p>
                                ))}
                              </motion.div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              toggleChapter(chapter.id);
                            }}
                            className="mt-20 mb-4 label-micro group/btn flex items-center gap-4 hover:text-primary transition-all pr-8 cursor-pointer mx-auto"
                          >
                            <span className="w-12 h-[1px] bg-text-low group-hover/btn:w-16 group-hover/btn:bg-primary transition-all" />
                            FECHAR REGISTRO
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
    </div>
  );
}
