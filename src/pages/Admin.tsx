import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, Lock, X, Plus, Sparkles, CheckCircle2, Edit3, Save, Trash2, ChevronDown, ChevronUp, RefreshCw, Edit2, Book, Loader2 } from 'lucide-react';
import { cn, parseChapterNumber } from '@/lib/utils';
import { getAI, MODELS, generateText, generateMultimodal } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { getAudioMetadata } from '@/lib/audioMetadata';
import { CombinationLock } from '@/components/ui/CombinationLock';

export function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'musicas' | 'lore' | 'editar_letras' | 'destaque' | 'acervo'>('musicas');
  const [password, setPassword] = useState('0000');
  const [error, setError] = useState('');
  
  const [albumTracks, setAlbumTracks] = useState<{ id: number; title: string; file: File | null; duration?: string; vibe?: string; lyrics?: string; artist?: string; trackNumber?: number }[]>([{ id: 1, title: '', file: null }]);
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumYear, setAlbumYear] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [albumCover, setAlbumCover] = useState<File | null>(null);
  const [isPublishingAlbum, setIsPublishingAlbum] = useState(false);
  const [isGeneratingSynopses, setIsGeneratingSynopses] = useState(false);
  const [albumSuccess, setAlbumSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Lore State
  const [loreChaptersList, setLoreChaptersList] = useState<any[]>([]);
  const [loreView, setLoreView] = useState<'list' | 'form'>('list');
  const [editingLoreId, setEditingLoreId] = useState<number | null>(null);
  const [isDeletingLore, setIsDeletingLore] = useState<number | null>(null);

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
  const [featuredTrackIds, setFeaturedTrackIds] = useState<string[]>([]);
  const [isSavingFeatured, setIsSavingFeatured] = useState(false);
  const [featuredSuccess, setFeaturedSuccess] = useState('');

  // Acervo State
  const [allAlbums, setAllAlbums] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncing, setIsSyncing] = useState<number | null>(null);
  const [expandedAlbumId, setExpandedAlbumId] = useState<number | null>(null);
  const [acervoSuccess, setAcervoSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated && (activeTab === 'editar_letras' || activeTab === 'destaque' || activeTab === 'acervo')) {
      if (existingTracks.length === 0) {
        fetchExistingTracks();
      }
    }
    if (isAuthenticated && activeTab === 'destaque') {
      fetchFeaturedTracks();
    }
    if (isAuthenticated && activeTab === 'acervo') {
      fetchAllAlbums();
    }
    if (isAuthenticated && activeTab === 'lore') {
      fetchLoreChapters();
    }
  }, [isAuthenticated, activeTab]);

  const fetchLoreChapters = async () => {
    const { data, error } = await supabase
      .from('lore_chapters')
      .select('*');
    
    if (!error && data) {
      const filtered = data.filter(c => c.title && !c.title.startsWith('__'));
      filtered.sort((a, b) => parseChapterNumber(a.chapter_number) - parseChapterNumber(b.chapter_number));
      setLoreChaptersList(filtered);
    }
  };

  const fetchAllAlbums = async () => {
    const { data, error } = await supabase
      .from('albums')
      .select(`
        *,
        tracks (*)
      `)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setAllAlbums(data);
    }
  };

  const handleDeleteAlbum = async (albumId: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este álbum e todas as suas músicas? Esta ação é irreversível.')) return;
    
    setIsDeleting(true);
    setError('');
    
    try {
      const albumToDelete = allAlbums.find(a => a.id === albumId);
      const tracksToDelete = albumToDelete?.tracks || [];

      // 1. Delete tracks from DB
      const { error: tracksError } = await supabase
        .from('tracks')
        .delete()
        .eq('album_id', albumId);
      
      if (tracksError) throw tracksError;

      // 2. Delete the album from DB
      const { error: albumError } = await supabase
        .from('albums')
        .delete()
        .eq('id', albumId);
      
      if (albumError) throw albumError;

      // 3. Delete files from Storage
      if (albumToDelete?.cover_url) {
        const coverName = albumToDelete.cover_url.split('/').pop();
        if (coverName) await supabase.storage.from('kyvra_images').remove([coverName]);
      }

      const audioFileNames = tracksToDelete
        .map((t: any) => t.audio_url?.split('/').pop())
        .filter(Boolean);
      
      if (audioFileNames.length > 0) {
        await supabase.storage.from('kyvra-audio').remove(audioFileNames);
      }

      setAcervoSuccess('Álbum, músicas e arquivos excluídos com sucesso.');
      setAllAlbums(allAlbums.filter(a => a.id !== albumId));
      setTimeout(() => setAcervoSuccess(''), 3000);
    } catch (err: any) {
      console.error('Erro ao excluir álbum:', err);
      setError('Falha ao excluir álbum: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteTrack = async (trackId: number, albumId: number) => {
    if (!window.confirm('Excluir esta música?')) return;
    
    setIsDeleting(true);
    setError('');
    
    try {
      const trackToDelete = allAlbums.flatMap(a => a.tracks).find((t: any) => t.id === trackId);

      const { error: trackError } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);
      
      if (trackError) throw trackError;

      if (trackToDelete?.audio_url) {
        const fileName = trackToDelete.audio_url.split('/').pop();
        if (fileName) await supabase.storage.from('kyvra-audio').remove([fileName]);
      }

      setAcervoSuccess('Música e arquivo excluídos.');
      setAllAlbums(allAlbums.map(a => {
        if (a.id === albumId) {
          return { ...a, tracks: a.tracks.filter((t: any) => t.id !== trackId) };
        }
        return a;
      }));
      setTimeout(() => setAcervoSuccess(''), 3000);
    } catch (err: any) {
      console.error('Erro ao excluir música:', err);
      setError('Falha ao excluir música: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateAlbumField = async (albumId: number, field: string, value: any) => {
    try {
      const { error: updateError } = await supabase
        .from('albums')
        .update({ [field]: value })
        .eq('id', albumId);
      
      if (updateError) throw updateError;
      
      setAllAlbums(allAlbums.map(a => a.id === albumId ? { ...a, [field]: value } : a));
    } catch (err: any) {
      console.error('Erro ao atualizar álbum:', err);
      setError('Falha ao atualizar: ' + err.message);
    }
  };

  const handleUpdateTrackField = async (trackId: number, albumId: number, field: string, value: any) => {
    try {
      const { error: updateError } = await supabase
        .from('tracks')
        .update({ [field]: value })
        .eq('id', trackId);
      
      if (updateError) throw updateError;
      
      setAllAlbums(allAlbums.map(a => {
        if (a.id === albumId) {
          return {
            ...a,
            tracks: a.tracks.map((t: any) => t.id === trackId ? { ...t, [field]: value } : t)
          };
        }
        return a;
      }));
    } catch (err: any) {
      console.error('Erro ao atualizar música:', err);
      setError('Falha ao atualizar música: ' + err.message);
    }
  };

  const handleSyncTrackMetadata = async (track: any, albumId: number) => {
    if (!track.audio_url) return;
    
    setIsSyncing(track.id);
    setError('');
    
    try {
      console.log(`Sincronizando metadados para: ${track.title}`);
      const metadata = await getAudioMetadata(track.audio_url);
      
      const updates: any = {};
      // Only update if the field is empty or if we want to "refresh"
      // User said: "sem retirar a edição manual existente" -> we'll only fill what's missing
      // OR we can just apply everything that was found in the tags.
      // Let's be smart: if the tag has data, we use it, but we keep track of what was there.
      
      if (metadata.title) updates.title = track.title || metadata.title;
      if (metadata.artist) updates.artist = track.artist || metadata.artist;
      if (metadata.lyrics) updates.lyrics = track.lyrics || metadata.lyrics;
      if (metadata.trackNumber) updates.track_number = track.track_number || metadata.trackNumber;
      if (metadata.duration) updates.duration = track.duration || metadata.duration;
      if (metadata.genre) updates.vibe = track.vibe || metadata.genre;

      const { error: updateError } = await supabase
        .from('tracks')
        .update(updates)
        .eq('id', track.id);
      
      if (updateError) throw updateError;
      
      setAcervoSuccess(`Metadados de "${track.title}" sincronizados.`);
      
      setAllAlbums(allAlbums.map(a => {
        if (a.id === albumId) {
          return {
            ...a,
            tracks: a.tracks.map((t: any) => t.id === track.id ? { ...t, ...updates } : t)
          };
        }
        return a;
      }));

      setTimeout(() => setAcervoSuccess(''), 3000);
    } catch (err: any) {
      console.error('Erro ao sincronizar:', err);
      setError('Falha na sincronização: ' + err.message);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleSyncAlbumMetadata = async (album: any) => {
    if (!album.tracks || album.tracks.length === 0) return;
    
    setAcervoSuccess(`Sincronizando ${album.tracks.length} faixas...`);
    let successCount = 0;
    
    for (const track of album.tracks) {
      try {
        await handleSyncTrackMetadata(track, album.id);
        successCount++;
      } catch (e) {
        console.error(`Erro ao sincronizar faixa ${track.title}:`, e);
      }
    }
    
    setAcervoSuccess(`${successCount} faixas sincronizadas com sucesso.`);
    setTimeout(() => setAcervoSuccess(''), 3000);
  };

  const fetchFeaturedTracks = async () => {
    const { data: dataList } = await supabase
      .from('lore_chapters')
      .select('content')
      .eq('title', '__FEATURED_TRACKS_JSON__')
      .order('id', { ascending: false })
      .limit(1);
    
    const data = dataList?.[0];
    if (data && data.content) {
      try {
        const ids = JSON.parse(data.content);
        if (Array.isArray(ids)) {
          setFeaturedTrackIds(ids);
          return;
        }
      } catch (e) { console.error(e); }
    }

    const { data: oldDataList } = await supabase
      .from('lore_chapters')
      .select('content')
      .eq('title', '__FEATURED_TRACK__')
      .order('id', { ascending: false })
      .limit(1);
    const oldData = oldDataList?.[0];
    if (oldData) setFeaturedTrackIds([oldData.content]);
  };

  const handleSaveFeatured = async () => {
    if (featuredTrackIds.length === 0) return;
    setIsSavingFeatured(true);
    setFeaturedSuccess('');
    setError('');

    try {
      const jsonContent = JSON.stringify(featuredTrackIds);
      
      // 1. Save the JSON array of featured tracks
      const { data: existingList } = await supabase
        .from('lore_chapters')
        .select('id')
        .eq('title', '__FEATURED_TRACKS_JSON__')
        .order('id', { ascending: false })
        .limit(1);
      
      const existing = existingList?.[0];

      if (existing) {
        await supabase
          .from('lore_chapters')
          .update({ content: jsonContent })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('lore_chapters')
          .insert({
            title: '__FEATURED_TRACKS_JSON__',
            content: jsonContent,
            chapter_number: -10
          });
      }

      // 2. Compatibility: Update the old single featured track entry with the first one
      const { data: oldExistingList } = await supabase
        .from('lore_chapters')
        .select('id')
        .eq('title', '__FEATURED_TRACK__')
        .order('id', { ascending: false })
        .limit(1);
      
      const oldExisting = oldExistingList?.[0];
      
      if (oldExisting) {
        await supabase.from('lore_chapters').update({ content: featuredTrackIds[0] }).eq('id', oldExisting.id);
      } else {
        await supabase.from('lore_chapters').insert({ 
          title: '__FEATURED_TRACK__', 
          content: featuredTrackIds[0], 
          chapter_number: -1 
        });
      }

      // 3. Generate synopses for each track if they don't exist
      for (const trackId of featuredTrackIds) {
        const synopsisTitle = `__SYNOPSIS_${trackId}__`;
        const { data: existingSynList } = await supabase
          .from('lore_chapters')
          .select('id')
          .eq('title', synopsisTitle)
          .order('id', { ascending: false })
          .limit(1);
        
        const existingSyn = existingSynList?.[0];

        if (!existingSyn) {
          const { data: trackData } = await supabase
            .from('tracks')
            .select('title, artist, lyrics')
            .eq('id', trackId)
            .single();

          if (trackData && trackData.lyrics) {
            const prompt = `Faça uma sinopse visceral (máximo 2 parágrafos) sobre a música "${trackData.title}" do artista "${trackData.artist || 'Kyvra'}" sob a ótica do Arco Psicológico de Kyvra.

            FILOSOFIA KYVRA (O Arco Psicológico):
            1. ✨ Fascínio: O amor é visto como salvação sobrenatural, mas as almas não se tocam, apenas especulam.
            2. 🔥 Entrega: Perda de identidade e mergulho espiritual completo.
            3. 🌑 Obsessão: O amor vira vício, ciúme e dependência dolorosa.
            4. 🩸 Ruína: A percepção de que o amor destrói, mas a escolha consciente pelo abismo em vez do vazio.
            5. 🕯️ Consciência: O entendimento da dor sem arrependimento, abraçando a destruição com um toque de narcisismo.

            ESTÉTICA: Gótica, íntima e dramática (estilo Evanescence/Black Veil Brides).

            Analise a letra: "${trackData.lyrics}"
            
            Sua missão:
            1. Explique a essência da música dentro do arco.
            2. Relacione com o diferencial de Kyvra: o abraço à destruição e o ego do eu lírico.
            
            REGRAS CRÍTICAS:
            - NÃO use asteriscos (*) ou (**).
            - NÃO use termos rebuscados.`;
            
            try {
              const cleanText = await generateText(prompt);
              await supabase
                .from('lore_chapters')
                .insert({
                  title: synopsisTitle,
                  content: cleanText,
                  chapter_number: -11
                });
            } catch (e) { 
              console.error(`Erro ao gerar sinopse para track ${trackId}:`, e); 
            }
          }
        }
      }

      setFeaturedSuccess('Destaques atualizados com sucesso!');
      setTimeout(() => setFeaturedSuccess(''), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar destaques:', err);
      setError('Falha ao salvar destaques: ' + err.message);
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
      const ai = getAI();
      
      const prompt = `Create a dark fantasy illustration for a story chapter titled "${loreTitle}". 
      Story content: "${loreContent}". 
      Aesthetic: medieval surreal and gothic painting, inspired by symphonic metal/rock album covers like Evanescence, Black Veil Brides, and Blackbriar. 
      The colors should deeply reflect the mood of the Kyvra narrative arc (Fascination, Surrender, Obsession, Ruin, or Consciousness). 
      Highly detailed, atmospheric, dark fantasy, emotional, dramatic lighting, cinematic.`;

      const response = await ai.models.generateContent({
        model: MODELS.IMAGE,
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
    setUploadProgress(0);
    setError('');
    setLoreSuccess('');

    try {
      let imageUrl = null;

      // Se houver uma imagem gerada (base64) ou arquivo manual, fazemos o upload para o bucket
      if (loreImageFile) {
        const fileExt = loreImageFile.name.split('.').pop();
        const fileName = `lore_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await (supabase.storage
          .from('kyvra_images')
          .upload(fileName, loreImageFile, {
            onUploadProgress: (progress: any) => setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
          } as any));
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('kyvra_images').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      } else if (generatedImage) {
        const res = await fetch(generatedImage);
        const blob = await res.blob();
        const fileName = `lore_${Date.now()}.png`;

        const { data: uploadData, error: uploadError } = await (supabase.storage
          .from('kyvra_images')
          .upload(fileName, blob, {
            onUploadProgress: (progress: any) => setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
          } as any));

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('kyvra_images')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrlData.publicUrl;
      }

      // Inserir ou atualizar no banco de dados
      const payload: any = {
        chapter_number: loreChapter,
        title: loreTitle,
        timeline_date: loreTimeline,
        content: loreContent,
      };

      if (imageUrl) {
        payload.image_url = imageUrl;
      }

      if (editingLoreId) {
        const { error: dbError } = await supabase
          .from('lore_chapters')
          .update(payload)
          .eq('id', editingLoreId);
        
        if (dbError) throw dbError;
        setLoreSuccess('Capítulo atualizado com sucesso!');
      } else {
        const { error: dbError } = await supabase
          .from('lore_chapters')
          .insert(payload);
        
        if (dbError) throw dbError;
        setLoreSuccess('Capítulo registrado no cosmos com sucesso!');
      }

      setLoreTitle('');
      setLoreContent('');
      setLoreChapter('');
      setLoreTimeline('');
      setGeneratedImage(null);
      setLoreImageFile(null);
      setEditingLoreId(null);
      setLoreView('list');
      fetchLoreChapters();
      
      setTimeout(() => setLoreSuccess(''), 5000);
    } catch (err: any) {
      console.error('Erro ao publicar lore:', err);
      setError('Falha ao registrar capítulo: ' + err.message);
    } finally {
      setIsPublishingLore(false);
    }
  };

  const handleDeleteLore = async (loreId: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este capítulo da Lore? Esta ação é irreversível.')) return;
    
    setIsDeletingLore(loreId);
    setError('');
    
    try {
      const chapter = loreChaptersList.find(c => c.id === loreId);
      
      const { error: dbError } = await supabase
        .from('lore_chapters')
        .delete()
        .eq('id', loreId);
      
      if (dbError) throw dbError;

      if (chapter?.image_url) {
        const coverName = chapter.image_url.split('/').pop();
        if (coverName) await supabase.storage.from('kyvra_images').remove([coverName]);
      }

      setLoreSuccess('Capítulo excluído com sucesso.');
      setLoreChaptersList(loreChaptersList.filter(c => c.id !== loreId));
      setTimeout(() => setLoreSuccess(''), 3000);
    } catch (err: any) {
      console.error('Erro ao excluir lore:', err);
      setError('Falha ao excluir capítulo: ' + err.message);
    } finally {
      setIsDeletingLore(null);
    }
  };

  const handleEditLore = (chapter: any) => {
    setLoreTitle(chapter.title || '');
    setLoreContent(chapter.content || '');
    setLoreChapter(chapter.chapter_number || '');
    setLoreTimeline(chapter.timeline_date || '');
    setEditingLoreId(chapter.id);
    setLoreView('form');
    setGeneratedImage(null);
    setLoreImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    setUploadProgress(0);
    setError('');
    setAlbumSuccess('');
    console.log('Iniciando publicação do álbum:', albumTitle);

    const uploadedFiles: { bucket: string, path: string }[] = [];
    
    try {
      // 0. Calcular tamanho total para o progresso
      const totalBytes = albumCover.size + validTracks.reduce((acc, t) => acc + (t.file?.size || 0), 0);
      let loadedBytesMap = new Map<string, number>();

      const updateProgress = (id: string, loaded: number) => {
        loadedBytesMap.set(id, loaded);
        const totalLoaded = Array.from(loadedBytesMap.values()).reduce((a, b) => a + b, 0);
        setUploadProgress(Math.round((totalLoaded / totalBytes) * 100));
      };

      // 1. Upload da Capa e das Faixas em paralelo
      console.log('Iniciando uploads em paralelo...');
      
      const coverExt = albumCover.name.split('.').pop();
      const coverFileName = `album_${Date.now()}.${coverExt}`;
      
      const coverUploadPromise = supabase.storage
        .from('kyvra_images')
        .upload(coverFileName, albumCover, {
          onUploadProgress: (progress: any) => updateProgress('cover', progress.loaded)
        } as any)
        .then(res => {
          if (!res.error) uploadedFiles.push({ bucket: 'kyvra_images', path: coverFileName });
          return res;
        });

      const trackUploadPromises = validTracks.map(async (track, i) => {
        const fileExt = track.file!.name.split('.').pop();
        const audioFileName = `track_${Date.now()}_${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('kyvra-audio')
          .upload(audioFileName, track.file!, {
            onUploadProgress: (progress: any) => updateProgress(`track_${i}`, progress.loaded)
          } as any);

        if (!uploadError) {
          uploadedFiles.push({ bucket: 'kyvra-audio', path: audioFileName });
        } else {
          throw uploadError;
        }

        const { data: audioUrlData } = supabase.storage
          .from('kyvra-audio')
          .getPublicUrl(audioFileName);

        return {
          ...track,
          audio_url: audioUrlData.publicUrl
        };
      });

      // Aguarda o upload da capa para criar o álbum
      const { error: coverError } = await coverUploadPromise;
      if (coverError) throw coverError;

      const { data: coverUrlData } = supabase.storage
        .from('kyvra_images')
        .getPublicUrl(coverFileName);

      // Aguarda o upload de todas as faixas ANTES de inserir no BD
      const uploadedTracks = await Promise.all(trackUploadPromises);

      // 2. Inserir Álbum no BD
      console.log('Registrando álbum no banco de dados...');
      const { data: albumData, error: albumDbError } = await supabase.from('albums').insert({
        title: albumTitle,
        release_year: albumYear,
        description: albumDesc,
        cover_url: coverUrlData.publicUrl
      }).select().single();

      if (albumDbError) throw albumDbError;
      console.log('Álbum registrado ID:', albumData.id);

      // 3. Inserção das Faixas no BD (Batch Insert)
      console.log('Inserindo faixas em lote...');
      const tracksToInsert = uploadedTracks.map((track, i) => ({
        album_id: albumData.id,
        title: track.title,
        audio_url: track.audio_url,
        track_number: track.trackNumber || (i + 1),
        duration: track.duration,
        vibe: track.vibe,
        lyrics: track.lyrics,
        artist: track.artist
      }));

      const { error: tracksDbError } = await supabase.from('tracks').insert(tracksToInsert);
      if (tracksDbError) {
        // Se falhar a inserção das faixas, deleta o álbum (que vai deletar as faixas em cascata no BD)
        await supabase.from('albums').delete().eq('id', albumData.id);
        throw tracksDbError;
      }

      // 4. Generate Album Synopsis
      const allLyrics = uploadedTracks
        .filter(t => t.lyrics)
        .map((t, i) => `Faixa ${i + 1} - ${t.title}:\n${t.lyrics}`)
        .join('\n\n');
      if (allLyrics) {
        console.log('Gerando sinopse do álbum...');
        const prompt = `Faça uma sinopse visceral (máximo 2 parágrafos) sobre o álbum "${albumTitle}" sob a ótica do Arco Psicológico de Kyvra.

        FILOSOFIA KYVRA (O Arco Psicológico):
        1. ✨ Fascínio: O amor é visto como salvação sobrenatural, mas as almas não se tocam, apenas especulam.
        2. 🔥 Entrega: Perda de identidade e mergulho espiritual completo.
        3. 🌑 Obsessão: O amor vira vício, ciúme e dependência dolorosa.
        4. 🩸 Ruína: A percepção de que o amor destrói, mas a escolha consciente pelo abismo em vez do vazio.
        5. 🕯️ Consciência: O entendimento da dor sem arrependimento, abraçando a destruição com um toque de narcisismo.

        ESTÉTICA: Gótica, íntima e dramática (estilo Evanescence/Black Veil Brides).

        Analise a jornada das letras abaixo:
        "${allLyrics}"
        
        Sua missão:
        1. Explique a jornada do álbum através dos estágios do arco.
        2. Relacione com o diferencial de Kyvra: o abraço à destruição e o ego do eu lírico.
        
        REGRAS CRÍTICAS:
        - NÃO use asteriscos (*) ou (**).`;

        try {
          const cleanText = await generateText(prompt);
            
          // Append synopsis to album description
          const newDesc = albumDesc ? `${albumDesc}\n\n${cleanText}` : cleanText;
          await supabase
            .from('albums')
            .update({ description: newDesc })
            .eq('id', albumData.id);
        } catch (aiErr) {
          console.error("Erro ao gerar sinopse do álbum:", aiErr);
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
      
      // Rollback: deletar arquivos que já foram upados caso algo dê errado
      if (uploadedFiles && uploadedFiles.length > 0) {
        console.log('Revertendo uploads devido a erro...');
        for (const file of uploadedFiles) {
          try {
            await supabase.storage.from(file.bucket).remove([file.path]);
          } catch (rollbackErr) {
            console.error(`Erro ao reverter arquivo ${file.path}:`, rollbackErr);
          }
        }
      }
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
      const ai = getAI();

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
          const prompt = `Faça uma sinopse visceral (máximo 2 parágrafos) sobre o álbum "${album.title}" sob a ótica do Arco Psicológico de Kyvra.

          FILOSOFIA KYVRA (O Arco Psicológico):
          1. ✨ Fascínio: O amor é visto como salvação sobrenatural, mas as almas não se tocam, apenas especulam.
          2. 🔥 Entrega: Perda de identidade e mergulho espiritual completo.
          3. 🌑 Obsessão: O amor vira vício, ciúme e dependência dolorosa.
          4. 🩸 Ruína: A percepção de que o amor destrói, mas a escolha consciente pelo abismo em vez do vazio.
          5. 🕯️ Consciência: O entendimento da dor sem arrependimento, abraçando a destruição com um toque de narcisismo.

          ESTÉTICA: Gótica, íntima e dramática (estilo Evanescence/Black Veil Brides).

          Analise a jornada das letras abaixo:
          "${allLyrics}"
          
          Sua missão:
          1. Explique a jornada do álbum através dos estágios do arco.
          2. Relacione com o diferencial de Kyvra: o abraço à destruição e o ego do eu lírico.
          
          REGRAS CRÍTICAS:
          - NÃO use asteriscos (*) ou (**).`;

          try {
            const cleanText = await generateText(prompt);
            
            const newDesc = album.description ? `${album.description}\n\n${cleanText}` : cleanText;
            await supabase
              .from('albums')
              .update({ description: newDesc })
              .eq('id', album.id);
            
            generatedCount++;
          } catch (aiErr) {
            console.error(`Erro ao gerar sinopse para o álbum ${album.title}:`, aiErr);
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
    // 1117 (Ateez debut/fandom) ou 2024
    if (password === '1117' || password === '2024') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Combinação incorreta. O arquivo permanece selado.');
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
          className="glass p-8 rounded-xl w-full max-w-md flex flex-col items-center relative overflow-hidden"
        >
          {/* Noise effect */}
          <div className="absolute inset-0 bg-white/5 pointer-events-none mix-blend-overlay" />
          
          <Lock className="text-primary mb-4 relative z-10" size={32} />
          <h1 className="font-display text-3xl mb-2 relative z-10">O ARQUIVISTA</h1>
          <span className="font-sc text-xs tracking-[0.2em] text-text-low mb-8 relative z-10">ACESSO RESTRITO</span>
          
          <div className="mb-4 relative z-10 w-full flex flex-col items-center">
             <CombinationLock 
                value={password}
                onChange={setPassword}
                className="mt-2"
             />
             
             {error && (
               <span className="text-red-400 text-xs mt-6 text-center h-4">{error}</span>
             )}
             {!error && <div className="h-4 mt-6" />}
             
             <button 
               onClick={handleLogin}
               className="w-full mt-4 bg-primary text-void font-medium py-3 rounded hover:bg-primary/90 transition-colors"
             >
               Entrar no Arquivo
             </button>
          </div>
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
          onClick={() => setActiveTab('acervo')}
          className={cn("pb-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base", activeTab === 'acervo' ? "text-primary" : "text-text-mid")}
        >
          Gerenciar Acervo
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
            left: activeTab === 'musicas' ? 0 : activeTab === 'acervo' ? '155px' : activeTab === 'lore' ? '315px' : activeTab === 'editar_letras' ? '475px' : '595px',
            width: activeTab === 'musicas' ? '135px' : activeTab === 'acervo' ? '140px' : activeTab === 'lore' ? '145px' : activeTab === 'editar_letras' ? '100px' : '130px'
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
                      
                      // Auto-populate album title if not set
                      if (!albumTitle && metadata.album) {
                        setAlbumTitle(metadata.album);
                      }

                      return {
                        id: Date.now() + index,
                        title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
                        file: file,
                        duration: metadata.duration,
                        vibe: metadata.genre,
                        lyrics: metadata.lyrics,
                        artist: metadata.artist,
                        trackNumber: metadata.trackNumber
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
                  <div key={track.id} className="bg-void/50 p-4 rounded border border-border flex flex-col gap-2">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
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
                        <input 
                          type="text" 
                          value={track.vibe || ''}
                          onChange={e => setAlbumTracks(albumTracks.map(t => t.id === track.id ? { ...t, vibe: e.target.value } : t))}
                          placeholder="Gênero / Tags" 
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
                      <button onClick={() => removeTrack(track.id)} className="text-text-low hover:text-red-400 transition-colors p-2 md:mt-0 mt-2">
                        <X size={16} />
                      </button>
                    </div>
                    
                    <div className="w-full md:pl-10">
                      <textarea 
                        placeholder="Letras (opcional)"
                        rows={3}
                        value={track.lyrics || ''} 
                        onChange={e => setAlbumTracks(albumTracks.map(t => t.id === track.id ? { ...t, lyrics: e.target.value } : t))}
                        className="w-full bg-void border border-border rounded p-2 text-sm focus:border-primary outline-none resize-y font-sans"
                      />
                    </div>
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
                      vibe: metadata.genre,
                      lyrics: metadata.lyrics,
                      artist: metadata.artist,
                      trackNumber: metadata.trackNumber
                    } : t));
                  }
                }} 
              />
            </div>

            {error && <div className="text-red-400 text-sm text-right">{error}</div>}
            {albumSuccess && <div className="text-primary text-sm text-right flex items-center justify-end gap-2"><CheckCircle2 size={16} /> {albumSuccess}</div>}

            {isPublishingAlbum && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-text-low">
                  <span>PROGRESSO DO UPLOAD</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  />
                </div>
              </div>
            )}

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
      ) : activeTab === 'acervo' ? (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Gerenciar Acervo</h2>
            {acervoSuccess && <div className="text-primary text-sm flex items-center gap-2"><CheckCircle2 size={16} /> {acervoSuccess}</div>}
          </div>

          {allAlbums.length === 0 ? (
            <div className="text-center text-text-low py-12 glass rounded-xl">Nenhum álbum encontrado no arquivo.</div>
          ) : (
            <div className="space-y-4">
              {allAlbums.map(album => (
                <div key={album.id} className="glass rounded-xl overflow-hidden">
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => setExpandedAlbumId(expandedAlbumId === album.id ? null : album.id)}
                  >
                    <div className="flex items-center gap-4">
                      <img src={album.cover_url} alt={album.title} loading="lazy" decoding="async" className="w-12 h-12 rounded object-cover" referrerPolicy="no-referrer" />
                      <div>
                        <h3 className="font-medium text-text-high">{album.title}</h3>
                        <p className="text-xs text-text-low">{album.release_year} • {album.tracks?.length || 0} faixas</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSyncAlbumMetadata(album); }}
                        className="p-2 text-text-low hover:text-primary transition-colors"
                        title="Sincronizar Todas as Faixas"
                      >
                        <RefreshCw size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id); }}
                        className="p-2 text-text-low hover:text-red-400 transition-colors"
                        title="Excluir Álbum"
                      >
                        <Trash2 size={18} />
                      </button>
                      {expandedAlbumId === album.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {expandedAlbumId === album.id && (
                    <div className="p-6 border-t border-border bg-surface/30 space-y-6">
                      {/* Album Edit Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-text-low mb-1">Título do Álbum</label>
                          <input 
                            type="text" 
                            value={album.title} 
                            onChange={(e) => handleUpdateAlbumField(album.id, 'title', e.target.value)}
                            className="w-full bg-void border border-border rounded p-2 text-sm focus:border-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-low mb-1">Ano</label>
                          <input 
                            type="text" 
                            value={album.release_year} 
                            onChange={(e) => handleUpdateAlbumField(album.id, 'release_year', e.target.value)}
                            className="w-full bg-void border border-border rounded p-2 text-sm focus:border-primary outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-text-low mb-1">Descrição</label>
                        <textarea 
                          rows={3}
                          value={album.description || ''} 
                          onChange={(e) => handleUpdateAlbumField(album.id, 'description', e.target.value)}
                          className="w-full bg-void border border-border rounded p-2 text-sm focus:border-primary outline-none resize-y"
                        />
                      </div>

                      {/* Tracks List */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-text-mid">Faixas</h4>
                        {album.tracks?.sort((a: any, b: any) => (a.track_number || 0) - (b.track_number || 0)).map((track: any) => (
                          <div key={track.id} className="bg-void/50 p-3 rounded border border-border flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <input 
                                  type="text" 
                                  value={track.title} 
                                  onChange={(e) => handleUpdateTrackField(track.id, album.id, 'title', e.target.value)}
                                  className="w-full bg-transparent border-none p-0 text-sm font-medium text-text-high focus:ring-0"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleSyncTrackMetadata(track, album.id)}
                                  disabled={isSyncing === track.id}
                                  className={cn(
                                    "p-1.5 text-text-low hover:text-primary transition-colors",
                                    isSyncing === track.id && "animate-spin text-primary"
                                  )}
                                  title="Sincronizar Metadados (Tags)"
                                >
                                  <RefreshCw size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTrack(track.id, album.id)}
                                  className="text-text-low hover:text-red-400 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <input 
                                type="text" 
                                placeholder="Artista"
                                value={track.artist || ''} 
                                onChange={(e) => handleUpdateTrackField(track.id, album.id, 'artist', e.target.value)}
                                className="bg-void border border-border rounded p-1.5 text-xs focus:border-primary outline-none"
                              />
                              <input 
                                type="text" 
                                placeholder="Gêneros (ex: Metal Sinfônico | Rock Gótico)"
                                value={track.vibe || ''} 
                                onChange={(e) => handleUpdateTrackField(track.id, album.id, 'vibe', e.target.value)}
                                className="bg-void border border-border rounded p-1.5 text-xs focus:border-primary outline-none"
                              />
                              <input 
                                type="number" 
                                placeholder="Nº Faixa"
                                value={track.track_number || ''} 
                                onChange={(e) => handleUpdateTrackField(track.id, album.id, 'track_number', parseInt(e.target.value))}
                                className="bg-void border border-border rounded p-1.5 text-xs focus:border-primary outline-none"
                              />
                            </div>
                            <textarea 
                              placeholder="Letra"
                              rows={3}
                              value={track.lyrics || ''} 
                              onChange={(e) => handleUpdateTrackField(track.id, album.id, 'lyrics', e.target.value)}
                              className="w-full bg-void border border-border rounded p-2 text-xs focus:border-primary outline-none resize-y font-sans"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'lore' ? (
        <div className="w-full">
          {loreView === 'list' ? (
            <div className="flex flex-col space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display text-text-high uppercase tracking-widest">Capítulos da Lore</h2>
                <button
                  onClick={() => {
                    setEditingLoreId(null);
                    setLoreTitle('');
                    setLoreContent('');
                    setLoreChapter('');
                    setLoreTimeline('');
                    setGeneratedImage(null);
                    setLoreImageFile(null);
                    setLoreView('form');
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-void rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg"
                >
                  <Book size={18} />
                  <span>Novo Capítulo</span>
                </button>
              </div>

              <div className="grid gap-4 mt-6">
                {loreChaptersList.length === 0 ? (
                  <div className="text-center text-text-low py-12 border border-border rounded-xl">
                    Nenhum capítulo encontrado no cosmos.
                  </div>
                ) : (
                  loreChaptersList.map((chapter) => (
                    <div key={chapter.id} className="relative bg-void border border-border/50 rounded-xl p-6 transition-colors hover:border-border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3">
                          <p className="text-primary text-sm font-medium tracking-wide">
                            {chapter.timeline_date || `Capítulo ${chapter.chapter_number}`}
                          </p>
                          <h3 className="text-xl font-display text-text-high leading-tight uppercase">
                            {chapter.title}
                          </h3>
                          <p className="text-text-mid text-sm line-clamp-2">
                            {chapter.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleEditLore(chapter)}
                            className="text-primary/70 hover:text-primary transition-colors"
                            title="Editar Capítulo"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button
                            onClick={() => handleDeleteLore(chapter.id)}
                            disabled={isDeletingLore === chapter.id}
                            className="text-red-400/70 hover:text-red-400 transition-colors"
                            title="Excluir Capítulo"
                          >
                            {isDeletingLore === chapter.id ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              <Trash2 size={20} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="md:col-span-3 mb-2 flex items-center justify-between">
                <h2 className="text-xl">{editingLoreId ? 'Editar Capítulo' : 'Adicionar Capítulo da Cosmogonia'}</h2>
                <button 
                  onClick={() => setLoreView('list')}
                  className="px-4 py-2 border border-border rounded text-sm hover:bg-surface transition-colors"
                >
                  Voltar para Lista
                </button>
              </div>
              <div className="md:col-span-2 glass p-6 rounded-xl">
            
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

            {isPublishingLore && (loreImageFile || generatedImage) && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-xs font-mono text-text-low">
                  <span>PROGRESSO DO UPLOAD</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1 bg-border rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  />
                </div>
              </div>
            )}

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
          )}
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
          <h2 className="text-xl mb-6">Músicas em Destaque (Home)</h2>
          <p className="text-text-mid text-sm mb-8">
            Selecione as músicas que serão exibidas na página inicial. Você pode selecionar múltiplas músicas.
          </p>

          {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
          {featuredSuccess && <div className="text-primary text-sm mb-4 flex items-center gap-2"><CheckCircle2 size={16} /> {featuredSuccess}</div>}

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
              {existingTracks.map(track => {
                const isSelected = featuredTrackIds.includes(track.id.toString());
                return (
                  <div 
                    key={track.id}
                    onClick={() => {
                      if (isSelected) {
                        setFeaturedTrackIds(featuredTrackIds.filter(id => id !== track.id.toString()));
                      } else {
                        setFeaturedTrackIds([...featuredTrackIds, track.id.toString()]);
                      }
                    }}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between group",
                      isSelected ? "bg-primary/10 border-primary" : "bg-void/50 border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex-1">
                      <h3 className={cn("font-medium text-sm", isSelected ? "text-primary" : "text-text-high")}>{track.title}</h3>
                      <p className="text-[10px] text-text-low uppercase tracking-wider">{track.artist || 'Kyvra'}</p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary border-primary text-void" : "border-border group-hover:border-primary"
                    )}>
                      {isSelected && <CheckCircle2 size={12} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-text-low border-t border-border pt-4">
              <span>{featuredTrackIds.length} música(s) selecionada(s)</span>
              <button 
                onClick={() => setFeaturedTrackIds([])}
                className="text-primary hover:underline"
              >
                Limpar seleção
              </button>
            </div>

            <button
              onClick={handleSaveFeatured}
              disabled={isSavingFeatured || featuredTrackIds.length === 0}
              className="w-full bg-primary text-void font-medium py-3 rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingFeatured ? <div className="w-5 h-5 border-2 border-void border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
              {isSavingFeatured ? 'Salvando...' : 'Salvar Destaques'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
