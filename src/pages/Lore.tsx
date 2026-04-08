import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Loader2 } from 'lucide-react';

export function Lore() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function fetchLore() {
      const { data, error } = await supabase
        .from('lore_chapters')
        .select('*')
        .order('chapter_number', { ascending: true });

      if (!error && data) {
        setChapters(data);
      }
      setLoading(false);
    }
    fetchLore();
  }, []);

  const handleExplainLore = async (chapter: any) => {
    if (explanations[chapter.id]) return; // Already explained

    setLoadingExplanations(prev => ({ ...prev, [chapter.id]: true }));

    try {
      // @ts-ignore
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        setExplanations(prev => ({ ...prev, [chapter.id]: "A API Key do Gemini não foi encontrada. Por favor, adicione a secret VITE_GEMINI_API_KEY no AI Studio ou no Vercel." }));
        setLoadingExplanations(prev => ({ ...prev, [chapter.id]: false }));
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Você é um arquivista místico decifrando textos antigos. 
      Analise o seguinte capítulo da cosmogonia de Kyvra:
      Título: "${chapter.title}"
      Conteúdo: "${chapter.content}"
      
      Forneça uma interpretação profunda e poética deste capítulo. Explique os significados ocultos, as metáforas e os sentimentos transmitidos. Relacione os eventos descritos com temas de tempo, memória, escuridão e renascimento. Mantenha um tom gótico, surreal e acadêmico-místico. Seja conciso (máximo de 2 parágrafos).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      if (response.text) {
        setExplanations(prev => ({ ...prev, [chapter.id]: response.text }));
      }
    } catch (err) {
      console.error("Erro ao gerar explicação:", err);
      setExplanations(prev => ({ ...prev, [chapter.id]: "As brumas do tempo obscurecem esta interpretação. Tente novamente mais tarde." }));
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [chapter.id]: false }));
    }
  };

  return (
    <div className="w-full pt-32 px-6 pb-32 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, clipPath: 'inset(100% 0 0 0)' }}
        animate={{ opacity: 1, clipPath: 'inset(0% 0 0 0)' }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="mb-24 text-center"
      >
        <h1 className="text-5xl md:text-7xl mb-6">Cosmogonia de Kyvra</h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="font-sc text-sm tracking-[0.3em] text-primary"
        >
          A HISTÓRIA DOS FRAGMENTOS
        </motion.p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center text-primary">Decifrando os arquivos antigos...</div>
      ) : chapters.length === 0 ? (
        <div className="text-center text-text-low">Nenhum fragmento de história foi encontrado.</div>
      ) : (
        <div className="relative">
          {/* Timeline Line (Desktop) */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-primary to-secondary shadow-[0_0_8px_var(--primary)] -translate-x-1/2" />

          <div className="flex flex-col gap-24">
            {chapters.map((chapter, index) => {
              const isEven = index % 2 === 0;
              return (
                <motion.div 
                  key={chapter.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8 }}
                  className={`relative flex flex-col md:flex-row gap-8 md:gap-16 ${isEven ? 'md:flex-row-reverse' : ''}`}
                >
                  {/* Timeline Node */}
                  <div className="hidden md:block absolute left-1/2 top-8 w-3 h-3 rounded-full border border-primary bg-void shadow-[0_0_10px_var(--primary)] -translate-x-1/2 z-10" />

                  {/* Content */}
                  <div className={`flex-1 ${isEven ? 'md:text-right' : 'md:text-left'}`}>
                    <span className="font-sc text-[11px] tracking-[0.2em] text-primary mb-2 block">
                      {chapter.timeline_date || `Capítulo ${chapter.chapter_number}`}
                    </span>
                    <h2 className="text-3xl md:text-4xl mb-6">{chapter.title}</h2>
                    
                    {chapter.image_url && (
                      <div className={`mb-8 flex ${isEven ? 'justify-end' : 'justify-start'}`}>
                        <img 
                          src={chapter.image_url} 
                          alt={chapter.title}
                          className="w-full max-w-md rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-border/50 object-cover aspect-video"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <div className="prose prose-invert max-w-none">
                      <p className="font-sans font-light text-[17px] leading-[1.9] text-text-mid mb-8 whitespace-pre-line">
                        {chapter.content}
                      </p>
                      
                      <div className={`flex flex-col gap-4 mt-8 ${isEven ? 'items-end' : 'items-start'}`}>
                        {!explanations[chapter.id] && (
                          <button
                            onClick={() => handleExplainLore(chapter)}
                            disabled={loadingExplanations[chapter.id]}
                            className="flex items-center gap-2 px-4 py-2 bg-surface border border-primary/30 text-primary rounded-full hover:bg-primary/10 transition-colors text-sm font-medium"
                          >
                            {loadingExplanations[chapter.id] ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Sparkles size={16} />
                            )}
                            Decifrar Capítulo
                          </button>
                        )}

                        <AnimatePresence>
                          {explanations[chapter.id] && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="w-full bg-primary/5 border border-primary/20 rounded-lg p-6 mt-4 text-left"
                            >
                              <div className="flex items-center gap-2 text-primary mb-3">
                                <Sparkles size={18} />
                                <h4 className="font-display text-lg">Visão do Arquivista</h4>
                              </div>
                              <p className="text-text-mid text-sm leading-relaxed italic whitespace-pre-line">
                                {explanations[chapter.id]}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                  
                  {/* Empty space for the other side of the timeline */}
                  <div className="hidden md:block flex-1" />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
