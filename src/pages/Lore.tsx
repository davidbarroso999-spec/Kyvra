import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { getAI, MODELS, generateText } from '@/lib/ai';
import { Sparkles, Loader2, BookOpen, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Lore() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
        setChapters(data.filter(c => c.title && !c.title.startsWith('__')));
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
          <p className="mt-6 text-text-mid font-sans font-light max-w-2xl text-lg leading-relaxed italic">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {chapters.map((chapter, index) => (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                layoutId={`card-${chapter.id}`}
                onClick={() => setExpandedId(expandedId === chapter.id ? null : chapter.id)}
                className={cn(
                  "group relative overflow-hidden transition-all duration-700 cursor-pointer r-md",
                  expandedId === chapter.id 
                    ? "col-span-full md:col-span-2 lg:col-span-3 h-auto glass-premium p-8 md:p-12 mb-8" 
                    : "aspect-[3/4] glass hover:border-primary/40 hover:shadow-[0_0_60px_rgba(167,139,250,0.1)]"
                )}
              >
                {/* Image Background */}
                {chapter.image_url && (
                  <div className={cn(
                    "absolute inset-0 z-0 transition-all duration-1000",
                    expandedId === chapter.id ? "opacity-20 blur-2xl" : "opacity-30 group-hover:opacity-50 scale-110 group-hover:scale-100"
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

                {/* Content Overlay */}
                <div className={cn(
                  "relative z-10 h-full flex flex-col",
                  expandedId === chapter.id ? "justify-start" : "justify-end p-8"
                )}>
                  <div className="flex items-center justify-between mb-6">
                    <span className="label-micro text-primary">FRAGMENTO {chapter.chapter_number || index + 1}</span>
                    {chapter.timeline_date && (
                      <span className="label-secondary opacity-40">{chapter.timeline_date}</span>
                    )}
                  </div>

                  <h2 className={cn(
                    "font-display leading-[1.1] tracking-tight text-text-high transition-all mb-6",
                    expandedId === chapter.id ? "text-4xl md:text-7xl max-w-4xl" : "text-2xl md:text-3xl"
                  )}>
                    {chapter.title}
                  </h2>

                  <AnimatePresence mode="wait">
                    {expandedId === chapter.id ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-6xl"
                      >
                        <div className="h-[1px] w-12 bg-primary/40 mb-10" />
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                          <div className="lg:col-span-7 prose prose-invert max-w-none">
                            <div className="space-y-8">
                              {chapter.content.split('\n\n').map((para: string, i: number) => (
                                <p key={i} className="font-sans font-light text-text-mid text-lg md:text-xl leading-relaxed italic opacity-90 first-letter:text-4xl first-letter:font-display first-letter:text-primary first-letter:mr-2">
                                  {para}
                                </p>
                              ))}
                            </div>
                          </div>
                          
                          {chapter.image_url && (
                            <div className="lg:col-span-5 relative hidden lg:block">
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, rotate: 2 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, duration: 0.8 }}
                                className="sticky top-40"
                              >
                                <img 
                                  src={chapter.image_url} 
                                  alt={chapter.title}
                                  referrerPolicy="no-referrer" 
                                  className="w-full aspect-[4/5] object-cover r-md shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-border/10 transition-transform duration-700"
                                />
                                <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full -z-10 animate-pulse" />
                              </motion.div>
                            </div>
                          )}
                        </div>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                          className="mt-16 label-micro group/btn flex items-center gap-4 hover:text-primary transition-all pr-8"
                        >
                          <span className="w-8 h-[1px] bg-text-low group-hover/btn:w-12 group-hover/btn:bg-primary transition-all" />
                          FECHAR REGISTRO
                        </button>
                      </motion.div>
                    ) : (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-text-mid line-clamp-2 text-sm md:text-base font-sans font-light italic opacity-60 group-hover:opacity-100 transition-opacity"
                      >
                        {chapter.content.substring(0, 100)}...
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
