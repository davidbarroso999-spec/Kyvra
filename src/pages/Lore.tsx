import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { getAI, MODELS, generateText } from '@/lib/ai';
import { Sparkles, Loader2 } from 'lucide-react';

export function Lore() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [explanations, setExplanations] = useState<Record<number, string>>({});
  const [paragraphExplanations, setParagraphExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({}); // key: chapterId or `${chapterId}-${pIndex}`

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

  const handleExplainLore = async (chapter: any, text?: string, pIndex?: number) => {
    const textToAnalyze = text || chapter.content;
    const key = pIndex !== undefined ? `${chapter.id}-${pIndex}` : `${chapter.id}`;
    
    // Only return early if we have a successful explanation (not an error message)
    if (pIndex !== undefined && paragraphExplanations[key] && !paragraphExplanations[key].includes("inaudíveis") && !paragraphExplanations[key].includes("configurada")) return;
    if (pIndex === undefined && explanations[chapter.id] && !explanations[chapter.id].includes("inaudíveis") && !explanations[chapter.id].includes("configurada")) return;

    setLoadingExplanations(prev => ({ ...prev, [key]: true }));

    const prompt = `Você é o Cronista de Kyvra. Sua missão é explicar este trecho da história "${chapter.title}" sob a ótica do Arco Psicológico de Kyvra.

      FILOSOFIA KYVRA (O Arco Psicológico):
      1. ✨ Fascínio: O amor é visto como salvação sobrenatural, mas as almas não se tocam, apenas especulam.
      2. 🔥 Entrega: Perda de identidade e mergulho espiritual completo.
      3. 🌑 Obsessão: O amor vira vício, ciúme e dependência dolorosa.
      4. 🩸 Ruína: A percepção de que o amor destrói, mas a escolha consciente pelo abismo em vez do vazio.
      5. 🕯️ Consciência: O entendimento da dor sem arrependimento, abraçando a destruição com um toque de narcisismo.

      ESTÉTICA: Gótica, íntima e dramática (estilo Evanescence/Black Veil Brides).

      Analise este trecho: "${textToAnalyze}"
      
      Sua missão:
      1. Identifique em qual estágio do arco este momento se encontra.
      2. Explique o que está acontecendo de forma visceral e clara.
      3. Conecte com o diferencial de Kyvra: o abraço à destruição e o ego do eu lírico.
      4. Compare com uma obra histórica/cultural real que transmita essa mesma sensação.
      
      REGRAS CRÍTICAS: 
      - NÃO use asteriscos (*) ou (**).
      - Use no máximo 2 parágrafos curtos.`;

    try {
      const explanation = await generateText(prompt);
      if (pIndex !== undefined) {
        setParagraphExplanations(prev => ({ ...prev, [key]: explanation }));
      } else {
        setExplanations(prev => ({ ...prev, [chapter.id]: explanation }));
      }
    } catch (err) {
      console.error("Erro ao gerar explicação:", err);
      const errorMsg = "As brumas do tempo obscurecem esta interpretação. Verifique a conexão com a IA.";
      if (pIndex !== undefined) {
        setParagraphExplanations(prev => ({ ...prev, [key]: errorMsg }));
      } else {
        setExplanations(prev => ({ ...prev, [chapter.id]: errorMsg }));
      }
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [key]: false }));
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
                      <div className="space-y-8 mb-8">
                        {chapter.content.split('\n\n').map((paragraph, pIdx) => (
                          <div key={pIdx} className="group relative">
                            <p className="font-sans font-light text-[17px] leading-[1.9] text-text-mid whitespace-pre-line">
                              {paragraph}
                            </p>
                            
                            <div className={`mt-4 flex flex-col ${isEven ? 'items-end' : 'items-start'}`}>
                              {!paragraphExplanations[`${chapter.id}-${pIdx}`] && (
                                <button 
                                  onClick={() => handleExplainLore(chapter, paragraph, pIdx)}
                                  disabled={loadingExplanations[`${chapter.id}-${pIdx}`]}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary/60 hover:text-primary disabled:opacity-50"
                                >
                                  {loadingExplanations[`${chapter.id}-${pIdx}`] ? (
                                    <Loader2 size={10} className="animate-spin" />
                                  ) : (
                                    <Sparkles size={10} />
                                  )}
                                  Decifrar Parágrafo
                                </button>
                              )}

                              <AnimatePresence>
                                {paragraphExplanations[`${chapter.id}-${pIdx}`] && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full bg-primary/5 border border-primary/10 rounded-lg p-4 mt-2 text-left"
                                  >
                                    <p className="text-text-mid text-xs leading-relaxed italic">
                                      {paragraphExplanations[`${chapter.id}-${pIdx}`]}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className={`flex flex-col gap-4 mt-8 ${isEven ? 'items-end' : 'items-start'}`}>
                        {!explanations[chapter.id] && (
                          <button
                            onClick={() => handleExplainLore(chapter)}
                            disabled={loadingExplanations[`${chapter.id}`]}
                            className="flex items-center gap-2 px-4 py-2 bg-surface border border-primary/30 text-primary rounded-full hover:bg-primary/10 transition-colors text-sm font-medium"
                          >
                            {loadingExplanations[`${chapter.id}`] ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Sparkles size={16} />
                            )}
                            Decifrar Capítulo Completo
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
