import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, Lock, X, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleGenAI } from '@google/genai';

export function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'musicas' | 'lore'>('musicas');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [albumTracks, setAlbumTracks] = useState([{ id: 1, title: '', file: null }]);

  const [loreTitle, setLoreTitle] = useState('');
  const [loreContent, setLoreContent] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleGenerateImage = async () => {
    if (!loreContent) {
      setError('Escreva o conteúdo da história para gerar a imagem.');
      return;
    }
    
    setIsGeneratingImage(true);
    setError('');
    
    try {
      // @ts-ignore
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Create an illustration for a story chapter titled "${loreTitle}". 
      Story content: "${loreContent}". 
      Aesthetic: medieval surreal and gothic painting, inspired by symphonic metal/rock album covers like Blackbriar. 
      The colors should deeply reflect the mood and aesthetic of the narrative. Highly detailed, atmospheric, dark fantasy.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt }
          ]
        }
      });

      const candidate = response.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
            setGeneratedImage(imageUrl);
            break;
          }
        }
      }
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      setError('Falha ao gerar a imagem. Tente novamente.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleLogin = () => {
    if (password === 'davidAt33z') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Senha incorreta. O arquivo permanece selado.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const addTrack = () => {
    setAlbumTracks([...albumTracks, { id: Date.now(), title: '', file: null }]);
  };

  const removeTrack = (id: number) => {
    setAlbumTracks(albumTracks.filter(t => t.id !== id));
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-xl w-full max-w-md flex flex-col items-center"
        >
          <Lock className="text-primary mb-4" size={32} />
          <h1 className="font-display text-3xl mb-2">KYVRA</h1>
          <span className="font-sc text-xs tracking-[0.2em] text-text-low mb-8">ACESSO RESTRITO</span>
          
          <input 
            type="password" 
            placeholder="Senha de Acesso" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-void border border-border rounded p-3 text-center mb-2 focus:outline-none focus:border-primary transition-colors"
          />
          
          {error && (
            <span className="text-red-400 text-xs mb-4 text-center">{error}</span>
          )}
          {!error && <div className="h-4 mb-4" />}
          
          <button 
            onClick={handleLogin}
            className="w-full bg-primary text-void font-medium py-3 rounded hover:bg-primary/90 transition-colors"
          >
            Entrar no Arquivo
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full pt-32 px-6 pb-32 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-12">
        <div>
          <span className="font-sc text-[11px] tracking-[0.3em] text-primary block mb-2">PAINEL DE CONTROLE</span>
          <h1 className="text-4xl md:text-5xl">O Arquivista</h1>
        </div>
        <button 
          onClick={() => setIsAuthenticated(false)}
          className="text-sm text-text-low hover:text-text-high transition-colors"
        >
          Sair
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-border mb-12 relative">
        <button 
          onClick={() => setActiveTab('musicas')}
          className={cn("pb-4 font-medium transition-colors", activeTab === 'musicas' ? "text-primary" : "text-text-mid")}
        >
          Músicas & Álbuns
        </button>
        <button 
          onClick={() => setActiveTab('lore')}
          className={cn("pb-4 font-medium transition-colors", activeTab === 'lore' ? "text-primary" : "text-text-mid")}
        >
          Cosmogonia (Lore)
        </button>
        
        {/* Animated Indicator */}
        <motion.div 
          className="absolute bottom-0 h-[2px] bg-primary"
          initial={false}
          animate={{ 
            left: activeTab === 'musicas' ? 0 : '140px',
            width: activeTab === 'musicas' ? '130px' : '145px'
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Content */}
      {activeTab === 'musicas' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Album Info */}
            <div className="glass p-6 rounded-xl">
              <h2 className="text-xl mb-6">Informações do Álbum / EP</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-text-mid mb-2">Título do Álbum</label>
                    <input type="text" className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm text-text-mid mb-2">Ano de Lançamento</label>
                    <input type="text" placeholder="Ex: 2024" className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-mid mb-2">Descrição / Conceito</label>
                  <textarea rows={3} className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors resize-y" />
                </div>
              </div>
            </div>

            {/* Tracks Info */}
            <div className="glass p-6 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl">Faixas do Álbum</h2>
                <button onClick={addTrack} className="text-sm text-primary hover:text-primary/80 flex items-center gap-2 transition-colors">
                  <Plus size={16} /> Adicionar Faixa
                </button>
              </div>

              {/* Bulk Upload Dropzone */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-text-low hover:border-primary hover:text-primary transition-colors cursor-pointer group mb-8">
                <Upload className="mb-2 group-hover:-translate-y-1 transition-transform" />
                <span className="font-medium mb-1 text-text-high group-hover:text-primary transition-colors">Upload em Massa</span>
                <span className="text-sm text-center">Arraste múltiplos arquivos de áudio aqui para criar as faixas automaticamente</span>
              </div>

              {/* Track List */}
              <div className="space-y-4">
                {albumTracks.map((track, index) => (
                  <div key={track.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-void/50 p-4 rounded border border-border">
                    <span className="font-mono text-text-low w-6">{index + 1}</span>
                    <div className="flex-1 w-full">
                      <input type="text" placeholder="Título da Faixa" className="w-full bg-void border border-border rounded p-2 focus:border-primary outline-none transition-colors text-sm" />
                    </div>
                    <div className="flex-1 w-full">
                      <div className="border border-border rounded p-2 text-sm text-text-low flex items-center justify-center cursor-pointer hover:border-primary hover:text-primary transition-colors">
                        Selecionar Áudio
                      </div>
                    </div>
                    <button onClick={() => removeTrack(track.id)} className="text-text-low hover:text-red-400 transition-colors p-2">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button className="px-8 py-3 bg-primary text-void font-medium rounded hover:bg-primary/90 transition-colors">
                Publicar Álbum
              </button>
            </div>
          </div>

          {/* Right Column: Cover */}
          <div className="space-y-8">
            <div className="glass p-6 rounded-xl h-fit">
              <h2 className="text-xl mb-6">Capa do Álbum</h2>
              <div className="aspect-square w-full bg-void border border-border rounded-lg flex flex-col items-center justify-center text-text-low mb-4 p-4 text-center">
                <span className="mb-2">Sem imagem</span>
                <span className="text-xs opacity-70">(Capa uniforme para todas as faixas)</span>
              </div>
              <button className="w-full py-2 border border-border rounded text-sm hover:bg-surface transition-colors">
                Fazer Upload da Capa
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 glass p-6 rounded-xl">
            <h2 className="text-xl mb-6">Adicionar Capítulo da Cosmogonia</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-text-mid mb-2">Número do Capítulo</label>
                  <input type="text" placeholder="Ex: I, II, 01..." className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-text-mid mb-2">Título</label>
                  <input 
                    type="text" 
                    value={loreTitle}
                    onChange={(e) => setLoreTitle(e.target.value)}
                    placeholder="Ex: A Queda" 
                    className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-mid mb-2">Data na Linha do Tempo</label>
                <input type="text" placeholder="Ex: O início do crepúsculo - Era da Lua" className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors" />
              </div>
              
              <div>
                <label className="block text-sm text-text-mid mb-2">Conteúdo (História Narrativa)</label>
                <textarea 
                  rows={8}
                  value={loreContent}
                  onChange={(e) => setLoreContent(e.target.value)}
                  placeholder="Escreva o fragmento da história aqui..."
                  className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors resize-y"
                />
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button className="px-6 py-2 bg-primary text-void font-medium rounded hover:bg-primary/90 transition-colors">
                Registrar no Cosmos
              </button>
            </div>
          </div>

          <div className="glass p-6 rounded-xl h-fit">
            <h2 className="text-xl mb-6">Ilustração do Capítulo</h2>
            <div className="min-h-[250px] w-full bg-void border border-border rounded-lg flex items-center justify-center text-text-low mb-4 p-4 text-center overflow-hidden relative">
              {isGeneratingImage ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-primary animate-pulse">Conjurando imagem...</span>
                </div>
              ) : generatedImage ? (
                <img src={generatedImage} alt="Capa gerada" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <span>Sem imagem (Qualquer formato)</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !loreContent}
                className="w-full py-2 bg-primary/10 text-primary border border-primary/30 rounded text-sm hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Gerar Imagem com IA
              </button>
              <button className="w-full py-2 border border-border rounded text-sm hover:bg-surface transition-colors">
                Fazer Upload Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
