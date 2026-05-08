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
          <div className="flex flex-col w-full h-auto min-h-[85vh] gap-4 pb-10">
            {chapters.map((chapter, index) => (
              <motion.div
                key={chapter.id}
                id={`chapter-${chapter.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  if (expandedId !== chapter.id) {
                    setExpandedId(chapter.id);
                    setTimeout(() => {
                      const el = document.getElementById(`chapter-${chapter.id}`);
                      if (el) {
                        const y = el.getBoundingClientRect().top + window.scrollY - 100;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    }, 50);
                  }
                }}
                className={cn(
                  "group relative overflow-hidden transition-[flex,background-color] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] r-md flex flex-col translate-z-0",
                  expandedId === chapter.id 
                    ? "flex-none h-auto shadow-[0_8px_30px_rgba(0,0,0,0.5)] cursor-default glass-premium" 
                    : "flex-[1] min-h-[140px] lg:min-h-[180px] glass hover:border-primary/40 shadow-sm cursor-pointer"
                )}
              >
                {/* Image Background */}
                {chapter.image_url && (
                  <div className={cn(
                    "absolute inset-0 z-0 transition-all duration-700",
                    expandedId === chapter.id ? "opacity-20 blur-2xl" : "opacity-30 group-hover:opacity-60 scale-110 group-hover:scale-100"
                  )}>
                    <img 
                      src={chapter.image_url} 
                      alt={chapter.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />
                  </div>
                )}

                {/* Uiverse-style pseudo layer (glow opacity on hover) */}
                <div className={cn(
                  "absolute inset-0 bg-white/5 z-0 transition-opacity duration-500 pointer-events-none",
                  expandedId === chapter.id ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                )} />

                {/* Content Overlay */}
                <div className={cn(
                  "relative z-10 w-full p-4 lg:p-10 flex flex-col transition-all duration-500",
                  expandedId === chapter.id 
                    ? "justify-start h-auto overflow-visible items-center text-center" 
                    : "justify-end items-start h-full overflow-hidden"
                )}>
                  
                  <div 
                    className={cn(
                      "flex transition-all duration-500 w-full relative",
                      expandedId === chapter.id 
                        ? "flex-col mb-10 items-center cursor-pointer group/header hover:opacity-80" 
                        : "flex-col md:flex-row items-start md:items-end justify-start gap-2 md:gap-6"
                    )}
                    onClick={(e) => {
                      if (expandedId === chapter.id) {
                        e.stopPropagation();
                        setExpandedId(null);
                        setTimeout(() => {
                          const el = document.getElementById(`chapter-${chapter.id}`);
                          if (el) {
                            const y = el.getBoundingClientRect().top + window.scrollY - 100;
                            window.scrollTo({ top: y, behavior: 'smooth' });
                          }
                        }, 50);
                      }
                    }}
                  >
                    <span className={cn(
                      "label-micro tracking-[0.3em] transition-all duration-500 shrink-0",
                      expandedId === chapter.id ? "text-primary text-sm mb-2" : "text-accent group-hover:text-primary"
                    )}>
                      {chapter.chapter_number || index + 1}
                    </span>

                    <h2 className={cn(
                      "font-display leading-[1.1] tracking-tight text-text-high transition-all duration-500 m-0 [text-wrap:balance]",
                      expandedId === chapter.id 
                        ? "text-4xl md:text-6xl lg:text-8xl mt-2 max-w-4xl mx-auto" 
                        : "text-xl md:text-3xl lg:text-4xl lg:w-full line-clamp-2 text-left"
                    )}>
                      {chapter.title}
                    </h2>
                  </div>

                  <div 
                    className={cn(
                      "grid transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] w-full",
                      expandedId === chapter.id ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="w-full max-w-6xl mx-auto pb-4 pt-2 flex flex-col items-center">
                        <div className="h-[1px] w-12 bg-primary/40 mb-10 mx-auto" />
                        <div className="flex flex-col gap-10 lg:gap-16 w-full items-center">
                          {chapter.image_url && (
                            <div className="w-full relative flex justify-center">
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={expandedId === chapter.id ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                                transition={{ delay: 0.1, duration: 0.6 }}
                                className="w-full max-w-5xl"
                              >
                                <img 
                                  src={chapter.image_url} 
                                  alt={chapter.title}
                                  referrerPolicy="no-referrer" 
                                  className="w-full h-auto max-h-[75vh] object-contain object-center r-md shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-border/10"
                                />
                                <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full -z-10 animate-pulse" />
                              </motion.div>
                            </div>
                          )}

                          <div className="w-full max-w-3xl prose prose-invert text-left">
                            <div className="space-y-8">
                              {chapter.content.split('\n\n').map((para: string, i: number) => (
                                <p key={i} className="font-sans font-light text-text-mid text-lg md:text-xl md:text-center lg:text-left leading-relaxed opacity-90 first-letter:text-4xl first-letter:font-display first-letter:text-primary first-letter:mr-2">
                                  {para}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setExpandedId(null); 
                            setTimeout(() => {
                              const el = document.getElementById(`chapter-${chapter.id}`);
                              if (el) {
                                const y = el.getBoundingClientRect().top + window.scrollY - 100;
                                window.scrollTo({ top: y, behavior: 'smooth' });
                              }
                            }, 50);
                          }}
                          className="mt-20 mb-8 label-micro group/btn flex items-center gap-4 hover:text-primary transition-all pr-8 cursor-pointer mx-auto"
                        >
                          <span className="w-12 h-[1px] bg-text-low group-hover/btn:w-16 group-hover/btn:bg-primary transition-all" />
                          FECHAR REGISTRO
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
