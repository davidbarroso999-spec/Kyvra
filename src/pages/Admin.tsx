import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'musicas' | 'lore'>('musicas');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 glass p-6 rounded-xl">
            <h2 className="text-xl mb-6">Adicionar Novo Fragmento Musical</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-text-mid mb-2">Título da Faixa</label>
                <input type="text" className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors" />
              </div>
              
              <div>
                <label className="block text-sm text-text-mid mb-2">Vibe (Tag)</label>
                <div className="flex flex-wrap gap-2">
                  {['Melancólico', 'Dark', 'Etéreo', 'Ambient', 'Introspectivo'].map(vibe => (
                    <button key={vibe} className="px-3 py-1 rounded-full border border-border text-sm hover:border-primary hover:text-primary transition-colors">
                      {vibe}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-mid mb-2">Arquivo de Áudio</label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-text-low hover:border-primary hover:text-primary transition-colors cursor-pointer group">
                  <Upload className="mb-2 group-hover:-translate-y-1 transition-transform" />
                  <span>Arraste o arquivo ou clique para selecionar</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button className="px-6 py-2 bg-primary text-void font-medium rounded hover:bg-primary/90 transition-colors">
                Salvar no Arquivo
              </button>
            </div>
          </div>

          <div className="glass p-6 rounded-xl h-fit">
            <h2 className="text-xl mb-6">Capa</h2>
            <div className="aspect-square bg-void border border-border rounded-lg flex items-center justify-center text-text-low mb-4">
              Sem imagem
            </div>
            <button className="w-full py-2 border border-border rounded text-sm hover:bg-surface transition-colors">
              Fazer Upload
            </button>
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
                  <input type="text" placeholder="Ex: A Queda" className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors" />
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
            <div className="min-h-[250px] w-full bg-void border border-border rounded-lg flex items-center justify-center text-text-low mb-4 p-4 text-center">
              Sem imagem (Qualquer formato)
            </div>
            <button className="w-full py-2 border border-border rounded text-sm hover:bg-surface transition-colors">
              Fazer Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
