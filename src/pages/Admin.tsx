import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, Lock, X, Plus, Sparkles, CheckCircle2, Edit3, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';
import { getAudioMetadata } from '@/lib/audioMetadata';

export function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'musicas' | 'lore' | 'editar_letras' | 'destaque'>('musicas');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [albumTracks, setAlbumTracks] = useState<{ id: number; title: string; file: File | null; duration?: string; genre?: string; lyrics?: string; artist?: string }[]>([{ id: 1, title: '', file: null }]);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumYear, setAlbumYear] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumCover, setAlbumCover] = useState<File | null>(null);
  const [isPublishingAlbum, setIsPublishingAlbum] = useState(false);
  const [isGeneratingSynopses, setIsGeneratingSynopses] = useState(false);
  const [albumSuccess, setAlbumSuccess] = useState('');

  const [loreChapter, setLoreChapter] = useState('');
  const [loreTimeline, setLoreTimeline] = useState('');
  const [loreTitle, setLoreTitle] = useState('');
  const [loreContent, setLoreContent] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isPublishingLore, setIsPublishingLore] = useState(false);
  const [loreSuccess, setLoreSuccess] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const bulkAudioInputRef = useRef<HTMLInputElement>(null);
  const loreImageInputRef = useRef<HTMLInputElement>(null);
  const [activeTrackId, setActiveTrackId] = useState<number | null>(null);
  const [loreImageFile, setLoreImageFile] = useState<File | null>(null);

  // Edit Lyrics State
  const [existingTracks, setExistingTracks] = useState<any[]>([]);
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [editingLyrics, setEditingLyrics] = useState('');
  const [isSavingLyrics, setIsSavingLyrics] = useState(false);
  const [lyricsSuccess, setLyricsSuccess] = useState('');

  // Destaque State
  const [featuredTrackId, setFeaturedTrackId] = useState<string>('');
  const [isSavingFeatured, setIsSavingFeatured] = useState(false);
  const [featuredSuccess, setFeaturedSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated && (activeTab === 'editar_letras' || activeTab === 'destaque')) {
      fetchExistingTracks();
    }
    if (isAuthenticated && activeTab === 'destaque') {
      fetchFeaturedTrack();
    }
  }, [isAuthenticated, activeTab]);

  const fetchFeaturedTrack = async () => {
    const { data } = await supabase
      .from('lore_chapters')
      .select('id, content')
      .eq('title', '__FEATURED_TRACK__')
      .single();
    
    if (data) {
      setFeaturedTrackId(data.content);
    }
  };

  const handleSaveFeatured = async () => {
    if (!featuredTrackId) return;
    setIsSavingFeatured(true);
    setFeaturedSuccess('');
    setError('');

    try {
      const { data: existing } = await supabase
        .from('lore_chapters')
        .select('id')
        .eq('title', '__FEATURED_TRACK__')
        .single();

      if (existing) {
        await supabase
          .from('lore_chapters')
          .update({ content: featuredTrackId })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('lore_chapters')
          .insert({
            title: '__FEATURED_TRACK__',
            content: featuredTrackId,
            chapter_number: -1
          });
      }

      // Generate synopsis for the featured track
      const { data: trackData } = await supabase
        .from('tracks')
        .select('title, artist, lyrics')
        .eq('id', featuredTrackId)
        .single();

      if (trackData && trackData.lyrics) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        
        const prompt = `Faça uma sinopse curta (máximo 2 parágrafos) sobre a música "${trackData.title}" do artista "${trackData.artist || 'Kyvra'}".
        Analise a letra abaixo e explique sobre o que ela se trata e seus sentimentos.
        Relacione com a filosofia central de Kyvra: "a busca por um amor que não é benéfico, mas proporcionalmente viciante, com alguns momentos de egocentrismo por parte do eu lírico".
        REGRAS CRÍTICAS:
        - NÃO use asteriscos (*) ou (**) em hipótese alguma.
        - NÃO use termos rebuscados ou difíceis.
        
        Letra:
        "${trackData.lyrics}"`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt
        });

        if (response.text) {
          const cleanText = response.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
            
            const { data: existingSynopsis } = await supabase
              .from('lore_chapters')
              .select('id')
              .eq('title', '__FEATURED_TRACK_SYNOPSIS__')
              .single();

            if (existingSynopsis) {
              await supabase
                .from('lore_chapters')
                .update({ content: cleanText })
                .eq('id', existingSynopsis.id);
            } else {
              await supabase
                .from('lore_chapters')
                .insert({
                  title: '__FEATURED_TRACK_SYNOPSIS__',
                  content: cleanText,
                  chapter_number: -2
                });
            }
          }
        }

        setFeaturedSuccess('Música de destaque atualizada com sucesso!');
        setTimeout(() => setFeaturedSuccess(''), 3000);
      } catch (err: any) {
      console.error('Erro ao salvar destaque:', err);
      setError('Falha ao salvar destaque: ' + err.message);
    } finally {
      setIsSavingFeatured(false);
    }
  };

  const fetchExistingTracks = async () => {
    const { data, error } = await supabase
      .from('tracks')
      .select('id, title, artist, lyrics')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setExistingTracks(data);
    }
  };

  const handleSaveLyrics = async (trackId: number) => {
    setIsSavingLyrics(true);
    setLyricsSuccess('');
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('tracks')
        .update({ lyrics: editingLyrics })
        .eq('id', trackId);

      if (updateError) throw updateError;

      setLyricsSuccess('Letra atualizada com sucesso!');
      setExistingTracks(existingTracks.map(t => t.id === trackId ? { ...t, lyrics: editingLyrics } : t));
      setEditingTrackId(null);
      
      setTimeout(() => setLyricsSuccess(''), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar letra:', err);
      setError('Falha ao salvar letra: ' + err.message);
    } finally {
      setIsSavingLyrics(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!loreContent) {
      setError('Escreva o conteúdo da história para gerar a imagem.');
      return;
    }
    
    setIsGeneratingImage(true);
    setError('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const prompt = `Create an illustration for a story chapter titled "${loreTitle}". 
      Story content: "${loreContent}". 
      Aesthetic: medieval surreal and gothic painting, inspired by symphonic metal/rock album covers like Blackbriar. 
      The colors should deeply reflect the mood and aesthetic of the narrative. Highly detailed, atmospheric, dark fantasy.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64EncodeString}`;
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

  const handlePublishLore = async () => {
    if (!loreTitle || !loreContent) {
      setError('Título e conteúdo são obrigatórios.');
      return;
    }

    setIsPublishingLore(true);
    setError('');
    setLoreSuccess('');

    try {
      let imageUrl = null;

      // Se houver uma imagem gerada (base64) ou arquivo manual, fazemos o upload para o bucket
      if (loreImageFile) {
        const fileExt = loreImageFile.name.split('.').pop();
        const fileName = `lore_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('kyvra_images').upload(fileName, loreImageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('kyvra_images').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      } else if (generatedImage) {
        const res = await fetch(generatedImage);
        const blob = await res.blob();
        const fileName = `lore_${Date.now()}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('kyvra_images')
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('kyvra_images')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrlData.publicUrl;
      }

      // Inserir no banco de dados
      const { error: dbError } = await supabase.from('lore_chapters').insert({
        chapter_number: loreChapter,
        title: loreTitle,
        timeline_date: loreTimeline,
        content: loreContent,
        image_url: imageUrl
      });

      if (dbError) throw dbError;

      setLoreSuccess('Capítulo registrado no cosmos com sucesso!');
      setLoreTitle('');
      setLoreContent('');
      setLoreChapter('');
      setLoreTimeline('');
      setGeneratedImage(null);
      setLoreImageFile(null);
      
      setTimeout(() => setLoreSuccess(''), 5000);
    } catch (err: any) {
      console.error('Erro ao publicar lore:', err);
      setError('Falha ao registrar capítulo: ' + err.message);
    } finally {
      setIsPublishingLore(false);
    }
  };

  const handlePublishAlbum = async () => {
    if (!albumTitle || !albumCover) {
      setError('Título do álbum e capa são obrigatórios.');
      return;
    }

    const validTracks = albumTracks.filter(t => t.title && t.file);
    if (validTracks.length === 0) {
      setError('Adicione pelo menos uma faixa com título e arquivo de áudio.');
      return;
    }

    setIsPublishingAlbum(true);
    setError('');
    setAlbumSuccess('');

    try {
      // 1. Upload da Capa
      const coverExt = albumCover.name.split('.').pop();
      const coverFileName = `album_${Date.now()}.${coverExt}`;
      
      const { error: coverError } = await supabase.storage
        .from('kyvra_images')
        .upload(coverFileName, albumCover);
        
      if (coverError) throw coverError;

      const { data: coverUrlData } = supabase.storage
        .from('kyvra_images')
        .getPublicUrl(coverFileName);

      // 2. Inserir Álbum no BD
      const { data: albumData, error: albumDbError } = await supabase.from('albums').insert({
        title: albumTitle,
        release_year: albumYear,
        description: albumDesc,
        cover_url: coverUrlData.publicUrl
      }).select().single();

      if (albumDbError) throw albumDbError;

      // 3. Upload das Faixas e Inserção no BD
      let allLyrics = '';
      for (let i = 0; i < validTracks.length; i++) {
        const track = validTracks[i];
        if (track.lyrics) {
          allLyrics += `\n\nFaixa ${i + 1} - ${track.title}:\n${track.lyrics}`;
        }
        const fileExt = track.file!.name.split('.').pop();
        const audioFileName = `track_${Date.now()}_${i}.${fileExt}`;

        const { error: audioError } = await supabase.storage
          .from('kyvra-audio')
          .upload(audioFileName, track.file!);

        if (audioError) throw audioError;

        const { data: audioUrlData } = supabase.storage
          .from('kyvra-audio')
          .getPublicUrl(audioFileName);

        const { error: trackDbError } = await supabase.from('tracks').insert({
          album_id: albumData.id,
          title: track.title,
          audio_url: audioUrlData.publicUrl,
          track_number: i + 1,
          duration: track.duration,
          vibe: track.genre,
          lyrics: track.lyrics,
          artist: track.artist
        });

        if (trackDbError) throw trackDbError;
      }

      // 4. Generate Album Synopsis
      if (allLyrics) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        
        const prompt = `Faça uma sinopse curta (máximo 2 parágrafos) sobre o álbum "${albumTitle}".
        Analise as letras das músicas abaixo, levando em consideração a ordem em que aparecem (como uma jornada).
        Crie uma "mini lore" explicando a jornada deste álbum, por exemplo: "O início da jornada, onde Kyvra percebe tal coisa...".
        Relacione com a filosofia central de Kyvra: "a busca por um amor que não é benéfico, mas proporcionalmente viciante, com alguns momentos de egocentrismo por parte do eu lírico".
        REGRAS CRÍTICAS:
        - NÃO use asteriscos (*) ou (**) em hipótese alguma.
        - NÃO use termos rebuscados ou difíceis.
        
        Letras do álbum:
        "${allLyrics}"`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt
        });

        if (response.text) {
          const cleanText = response.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
            
            // Append synopsis to album description
            const newDesc = albumDesc ? `${albumDesc}\n\n${cleanText}` : cleanText;
            await supabase
              .from('albums')
              .update({ description: newDesc })
              .eq('id', albumData.id);
          }
        }

        setAlbumSuccess('Álbum publicado com sucesso!');
        setAlbumTitle('');
        setAlbumYear('');
        setAlbumDesc('');
        setAlbumCover(null);
        setAlbumTracks([{ id: Date.now(), title: '', file: null }]);
        
        setTimeout(() => setAlbumSuccess(''), 5000);
      } catch (err: any) {
      console.error('Erro ao publicar álbum:', err);
      setError('Falha ao publicar álbum: ' + err.message);
    } finally {
      setIsPublishingAlbum(false);
    }
  };

  const handleGenerateMissingAlbumSynopses = async () => {
    setIsGeneratingSynopses(true);
    setError('');
    setAlbumSuccess('');

    try {
      // Fetch all albums
      const { data: albums, error: albumsError } = await supabase
        .from('albums')
        .select('id, title, description');

      if (albumsError) throw albumsError;

      let generatedCount = 0;

      for (const album of albums) {
        // Skip if it already has a description (assuming it's a synopsis)
        if (album.description && album.description.length > 50) continue;

        // Fetch tracks for this album
        const { data: tracks } = await supabase
          .from('tracks')
          .select('title, lyrics, track_number')
          .eq('album_id', album.id)
          .order('track_number', { ascending: true });

        if (!tracks || tracks.length === 0) continue;

        let allLyrics = '';
        for (const track of tracks) {
          if (track.lyrics) {
            allLyrics += `\n\nFaixa ${track.track_number} - ${track.title}:\n${track.lyrics}`;
          }
        }

        if (allLyrics) {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
          
          const prompt = `Faça uma sinopse curta (máximo 2 parágrafos) sobre o álbum "${album.title}".
          Analise as letras das músicas abaixo, levando em consideração a ordem em que aparecem (como uma jornada).
          Crie uma "mini lore" explicando a jornada deste álbum, por exemplo: "O início da jornada, onde Kyvra percebe tal coisa...".
          Relacione com a filosofia central de Kyvra: "a busca por um amor que não é benéfico, mas proporcionalmente viciante, com alguns momentos de egocentrismo por parte do eu lírico".
          REGRAS CRÍTICAS:
          - NÃO use asteriscos (*) ou (**) em hipótese alguma.
          - NÃO use termos rebuscados ou difíceis.
          
          Letras do álbum:
          "${allLyrics}"`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt
          });

          if (response.text) {
            const cleanText = response.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
            
            const newDesc = album.description ? `${album.description}\n\n${cleanText}` : cleanText;
            await supabase
              .from('albums')
              .update({ description: newDesc })
              .eq('id', album.id);
            
            generatedCount++;
          }
        }
      }

      setAlbumSuccess(`Sinopses geradas para ${generatedCount} álbum(ns).`);
      setTimeout(() => setAlbumSuccess(''), 5000);
    } catch (err: any) {
      console.error('Erro ao gerar sinopses:', err);
      setError('Falha ao gerar sinopses: ' + err.message);
    } finally {
      setIsGeneratingSynopses(false);
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
      <div className="flex gap-4 sm:gap-8 border-b border-border mb-8 sm:mb-12 relative overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveTab('musicas')}
          className={cn("pb-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base", activeTab === 'musicas' ? "text-primary" : "text-text-mid")}
        >
          Músicas & Álbuns
        </button>
        <button 
          onClick={() => setActiveTab('lore')}
          className={cn("pb-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base", activeTab === 'lore' ? "text-primary" : "text-text-mid")}
        >
          Cosmogonia (Lore)
        </button>
        <button 
          onClick={() => setActiveTab('editar_letras')}
          className={cn("pb-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base", activeTab === 'editar_letras' ? "text-primary" : "text-text-mid")}
        >
          Editar Letras
        </button>
        <button 
          onClick={() => setActiveTab('destaque')}
          className={cn("pb-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base", activeTab === 'destaque' ? "text-primary" : "text-text-mid")}
        >
          Destaque (Home)
        </button>
        
        {/* Animated Indicator */}
        <motion.div 
          className="absolute bottom-0 h-[2px] bg-primary"
          initial={false}
          animate={{ 
            left: activeTab === 'musicas' ? 0 : activeTab === 'lore' ? '155px' : activeTab === 'editar_letras' ? '315px' : '435px',
            width: activeTab === 'musicas' ? '135px' : activeTab === 'lore' ? '145px' : activeTab === 'editar_letras' ? '100px' : '130px'
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Content */}
      {activeTab === 'musicas' ? (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8 order-2 lg:order-1">
            {/* Album Info */}
            <div className="glass p-6 rounded-xl">
              <h2 className="text-xl mb-6">Informações do Álbum / EP</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-text-mid mb-2">Título do Álbum</label>
                    <input type="text" value={albumTitle} onChange={e => setAlbumTitle(e.target.value)} className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm text-text-mid mb-2">Ano de Lançamento</label>
                    <input type="text" value={albumYear} onChange={e => setAlbumYear(e.target.value)} placeholder="Ex: 2024" className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-mid mb-2">Descrição / Conceito</label>
                  <textarea rows={3} value={albumDesc} onChange={e => setAlbumDesc(e.target.value)} className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors resize-y" />
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
              <div 
                onClick={() => bulkAudioInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center text-text-low hover:border-primary hover:text-primary transition-colors cursor-pointer group mb-8"
              >
                <Upload className="mb-2 group-hover:-translate-y-1 transition-transform" />
                <span className="font-medium mb-1 text-text-high group-hover:text-primary transition-colors">Upload em Massa</span>
                <span className="text-sm text-center">Clique aqui para selecionar múltiplos arquivos de áudio</span>
              </div>
              <input 
                type="file" 
                multiple 
                accept="audio/*" 
                ref={bulkAudioInputRef} 
                className="hidden" 
                onChange={async (e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const files = Array.from(e.target.files) as File[];
                    
                    const newTracks = await Promise.all(files.map(async (file, index) => {
                      const metadata = await getAudioMetadata(file);
                      return {
                        id: Date.now() + index,
                        title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
                        file: file,
                        duration: metadata.duration,
                        genre: metadata.genre,
                        lyrics: metadata.lyrics,
                        artist: metadata.artist
                      };
                    }));

                    if (albumTracks.length === 1 && !albumTracks[0].title && !albumTracks[0].file) {
                      setAlbumTracks(newTracks);
                    } else {
                      setAlbumTracks([...albumTracks, ...newTracks]);
                    }
                  }
                }} 
              />

              {/* Track List */}
              <div className="space-y-4">
                {albumTracks.map((track, index) => (
                  <div key={track.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-void/50 p-4 rounded border border-border">
                    <span className="font-mono text-text-low w-6">{index + 1}</span>
                    <div className="flex-1 w-full">
                      <input 
                        type="text" 
                        value={track.title}
                        onChange={e => setAlbumTracks(albumTracks.map(t => t.id === track.id ? { ...t, title: e.target.value } : t))}
                        placeholder="Título da Faixa" 
                        className="w-full bg-void border border-border rounded p-2 focus:border-primary outline-none transition-colors text-sm" 
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <div 
                        onClick={() => {
                          setActiveTrackId(track.id);
                          audioInputRef.current?.click();
                        }}
                        className={cn(
                          "border rounded p-2 text-sm flex items-center justify-center cursor-pointer transition-colors",
                          track.file ? "border-primary text-primary" : "border-border text-text-low hover:border-primary hover:text-primary"
                        )}
                      >
                        {track.file ? (track.file as File).name : 'Selecionar Áudio'}
                      </div>
                    </div>
                    <button onClick={() => removeTrack(track.id)} className="text-text-low hover:text-red-400 transition-colors p-2">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <input 
                type="file" 
                accept="audio/*" 
                ref={audioInputRef} 
                className="hidden" 
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0] && activeTrackId) {
                    const file = e.target.files[0];
                    const metadata = await getAudioMetadata(file);
                    
                    setAlbumTracks(albumTracks.map(t => t.id === activeTrackId ? { 
                      ...t, 
                      file, 
                      title: metadata.title || t.title || file.name.replace(/\.[^/.]+$/, ""),
                      duration: metadata.duration,
                      genre: metadata.genre,
                      lyrics: metadata.lyrics,
                      artist: metadata.artist
                    } : t));
                  }
                }} 
              />
            </div>

            {error && <div className="text-red-400 text-sm text-right">{error}</div>}
            {albumSuccess && <div className="text-primary text-sm text-right flex items-center justify-end gap-2"><CheckCircle2 size={16} /> {albumSuccess}</div>}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
              <button 
                onClick={handleGenerateMissingAlbumSynopses}
                disabled={isGeneratingSynopses}
                className="w-full sm:w-auto px-6 py-3 border border-primary/30 text-primary rounded hover:bg-primary/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGeneratingSynopses ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Sparkles size={20} />}
                {isGeneratingSynopses ? 'Gerando...' : 'Gerar Sinopses Pendentes'}
              </button>
              <button 
                onClick={handlePublishAlbum}
                disabled={isPublishingAlbum}
                className="w-full sm:w-auto px-8 py-3 bg-primary text-void font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPublishingAlbum ? <div className="w-4 h-4 border-2 border-void border-t-transparent rounded-full animate-spin" /> : null}
                {isPublishingAlbum ? 'Publicando...' : 'Publicar Álbum'}
              </button>
            </div>
          </div>

          {/* Right Column: Cover */}
          <div className="space-y-8 order-1 lg:order-2">
            <div className="glass p-6 rounded-xl h-fit">
              <h2 className="text-xl mb-6">Capa do Álbum</h2>
              <div className="aspect-square w-full bg-void border border-border rounded-lg flex flex-col items-center justify-center text-text-low mb-4 p-4 text-center overflow-hidden relative">
                {albumCover ? (
                  <img src={URL.createObjectURL(albumCover)} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <span className="mb-2">Sem imagem</span>
                    <span className="text-xs opacity-70">(Capa uniforme para todas as faixas)</span>
                  </>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                ref={coverInputRef} 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setAlbumCover(e.target.files[0]);
                  }
                }} 
              />
              <button 
                onClick={() => coverInputRef.current?.click()}
                className="w-full py-2 border border-border rounded text-sm hover:bg-surface transition-colors"
              >
                Fazer Upload da Capa
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'lore' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 glass p-6 rounded-xl">
            <h2 className="text-xl mb-6">Adicionar Capítulo da Cosmogonia</h2>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-text-mid mb-2">Número do Capítulo</label>
                  <input type="text" value={loreChapter} onChange={e => setLoreChapter(e.target.value)} placeholder="Ex: I, II, 01..." className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors" />
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
                <input type="text" value={loreTimeline} onChange={e => setLoreTimeline(e.target.value)} placeholder="Ex: O início do crepúsculo - Era da Lua" className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors" />
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
            
            {error && <div className="text-red-400 text-sm text-right">{error}</div>}
            {loreSuccess && <div className="text-primary text-sm text-right flex items-center justify-end gap-2"><CheckCircle2 size={16} /> {loreSuccess}</div>}

            <div className="mt-8 flex justify-end">
              <button 
                onClick={handlePublishLore}
                disabled={isPublishingLore}
                className="px-6 py-2 bg-primary text-void font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isPublishingLore ? <div className="w-4 h-4 border-2 border-void border-t-transparent rounded-full animate-spin" /> : null}
                {isPublishingLore ? 'Registrando...' : 'Registrar no Cosmos'}
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
              ) : loreImageFile ? (
                <img src={URL.createObjectURL(loreImageFile)} alt="Capa manual" className="absolute inset-0 w-full h-full object-cover" />
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
              <input 
                type="file" 
                accept="image/*" 
                ref={loreImageInputRef} 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setLoreImageFile(e.target.files[0]);
                    setGeneratedImage(null); // Limpa a gerada se fizer upload manual
                  }
                }} 
              />
              <button 
                onClick={() => loreImageInputRef.current?.click()}
                className="w-full py-2 border border-border rounded text-sm hover:bg-surface transition-colors"
              >
                Fazer Upload Manual
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'editar_letras' ? (
        <div className="glass p-6 rounded-xl">
          <h2 className="text-xl mb-6">Editar Letras das Músicas</h2>
          <p className="text-text-mid text-sm mb-8">
            Selecione uma música já enviada para adicionar ou modificar sua letra. A Inteligência Artificial usará essa letra para gerar as explicações.
          </p>

          {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
          {lyricsSuccess && <div className="text-primary text-sm mb-4 flex items-center gap-2"><CheckCircle2 size={16} /> {lyricsSuccess}</div>}

          <div className="space-y-4">
            {existingTracks.length === 0 ? (
              <div className="text-center text-text-low py-8">Nenhuma música encontrada no arquivo.</div>
            ) : (
              existingTracks.map(track => (
                <div key={track.id} className="bg-void/50 border border-border rounded-lg overflow-hidden">
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => {
                      if (editingTrackId === track.id) {
                        setEditingTrackId(null);
                      } else {
                        setEditingTrackId(track.id);
                        setEditingLyrics(track.lyrics || '');
                      }
                    }}
                  >
                    <div>
                      <h3 className="font-medium text-text-high">{track.title}</h3>
                      <p className="text-xs text-text-low">{track.artist || 'Artista Desconhecido'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {track.lyrics ? (
                        <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">Com Letra</span>
                      ) : (
                        <span className="text-xs text-text-low bg-surface px-2 py-1 rounded">Sem Letra</span>
                      )}
                      <Edit3 size={16} className={editingTrackId === track.id ? "text-primary" : "text-text-mid"} />
                    </div>
                  </div>

                  {editingTrackId === track.id && (
                    <div className="p-4 border-t border-border bg-surface/30">
                      <textarea
                        rows={10}
                        value={editingLyrics}
                        onChange={(e) => setEditingLyrics(e.target.value)}
                        placeholder="Cole ou digite a letra da música aqui..."
                        className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors resize-y mb-4 font-sans text-sm"
                      />
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setEditingTrackId(null)}
                          className="px-4 py-2 text-sm text-text-mid hover:text-text-high transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveLyrics(track.id)}
                          disabled={isSavingLyrics}
                          className="px-6 py-2 bg-primary text-void font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                          {isSavingLyrics ? <div className="w-4 h-4 border-2 border-void border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                          {isSavingLyrics ? 'Salvando...' : 'Salvar Letra'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'destaque' ? (
        <div className="glass p-6 rounded-xl">
          <h2 className="text-xl mb-6">Música em Destaque (Home)</h2>
          <p className="text-text-mid text-sm mb-8">
            Selecione a música que será exibida com destaque na página inicial como "Último Lançamento".
          </p>

          {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
          {featuredSuccess && <div className="text-primary text-sm mb-4 flex items-center gap-2"><CheckCircle2 size={16} /> {featuredSuccess}</div>}

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-text-mid mb-2">Selecione a Música</label>
              <select
                value={featuredTrackId}
                onChange={(e) => setFeaturedTrackId(e.target.value)}
                className="w-full bg-void border border-border rounded p-3 focus:border-primary outline-none transition-colors"
              >
                <option value="">-- Nenhuma música selecionada --</option>
                {existingTracks.map(track => (
                  <option key={track.id} value={track.id.toString()}>
                    {track.title} {track.artist ? `- ${track.artist}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveFeatured}
              disabled={isSavingFeatured || !featuredTrackId}
              className="w-full bg-primary text-void font-medium py-3 rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingFeatured ? <div className="w-5 h-5 border-2 border-void border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
              {isSavingFeatured ? 'Salvando...' : 'Salvar Destaque'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
