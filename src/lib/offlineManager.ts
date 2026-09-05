import { saveForOffline, AUDIO_CACHE, FRAMES_CACHE } from './utils';
import { startPerformanceTrace, stopPerformanceTrace } from './performance';
import { 
  getAllTracks, 
  getAlbums, 
  getLoreChapters, 
  getFeaturedTracksSettings, 
  getAlbumWithTracks, 
  getTrackSynopses 
} from './apiCache';
import { FRAME_COUNT, frameUrl } from './albumsFrameCache';

export interface OfflineProgress {
  total: number;
  current: number;
  label: string;
}

const THEME_VIDEOS = [
  "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_abissal.webm",
  "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_sanguededrago.webm",
  "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_florestanegra.webm",
  "https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_monolito.webm"
];

// Utilitário de pool de concorrência com limite de tarefas simultâneas
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<void>
) {
  let index = 0;
  const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    while (index < items.length) {
      const currentItem = items[index++];
      try {
        await task(currentItem);
      } catch (err) {
        // Falhas pontuais em uma URL não abortam o pool
      }
    }
  });
  await Promise.all(workers);
}

export async function syncEverythingForOffline(onProgress?: (progress: OfflineProgress) => void): Promise<boolean> {
  await startPerformanceTrace('offline_full_sync_latency');
  try {
    if (onProgress) {
      onProgress({ total: 100, current: 5, label: 'Sincronizando arquivos de dados e catálogo...' });
    }

    // 1. Forçar sincronização e persistência de todas as tabelas no cache permanente (localStorage + RAM)
    const [
      tracksRes,
      albumsRes,
      loreRes,
      _featuredSettings
    ] = await Promise.all([
      getAllTracks(true),
      getAlbums(true),
      getLoreChapters(true),
      getFeaturedTracksSettings(true)
    ]);

    const tracks = tracksRes.data || [];
    const albums = albumsRes.data || [];
    const lore = loreRes.data || [];

    // 2. Cachear dados detalhados de cada álbum individualmente
    if (albums.length > 0) {
      await Promise.all(albums.map(a => getAlbumWithTracks(a.id, true)));
    }

    // 3. Cachear sinopses de todas as faixas
    const trackIds = tracks.map(t => String(t.id));
    if (trackIds.length > 0) {
      await getTrackSynopses(trackIds, true);
    }

    if (onProgress) {
      onProgress({ total: 100, current: 15, label: 'Catálogo salvo! Mapeando arquivos de mídia...' });
    }

    // 4. Mapear todas as URLs de mídia (áudios, capas, vídeos dos temas)
    const mediaUrls = new Set<string>();

    // Vídeos de fundo dos 4 temas
    THEME_VIDEOS.forEach(videoUrl => mediaUrls.add(videoUrl));

    // Áudios e capas de faixas
    tracks.forEach(t => {
      if (t.audio_url) mediaUrls.add(t.audio_url);
      if (t.albums?.cover_url) mediaUrls.add(t.albums.cover_url);
    });

    // Capas de álbuns
    albums.forEach(a => {
      if (a.cover_url) mediaUrls.add(a.cover_url);
    });

    // Imagens da Lore
    lore.forEach(l => {
      if (l.image_url) mediaUrls.add(l.image_url);
    });

    // 5. Mapear os 165 frames da sequência cósmica dos Álbuns
    const frameUrls: string[] = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      frameUrls.push(frameUrl(i));
    }

    const totalMediaCount = mediaUrls.size;
    const totalFramesCount = frameUrls.length;
    const totalItems = totalMediaCount + totalFramesCount;

    let processedCount = 0;

    const notifyProgress = (label: string) => {
      if (onProgress) {
        onProgress({
          total: totalItems,
          current: processedCount,
          label
        });
      }
    };

    // 6. Baixar e armazenar todas as mídias principais (áudios, vídeos, capas) no cache de áudio/mídia
    const mediaArray = Array.from(mediaUrls);
    await runWithConcurrency(mediaArray, 5, async (url) => {
      await saveForOffline(url, AUDIO_CACHE);
      processedCount++;
      notifyProgress(`Baixando áudios e vídeos (${processedCount}/${totalItems})...`);
    });

    // 7. Baixar e armazenar a sequência completa de frames no cache de frames
    await runWithConcurrency(frameUrls, 8, async (url) => {
      await saveForOffline(url, FRAMES_CACHE);
      processedCount++;
      notifyProgress(`Armazenando crônica cósmica (${processedCount}/${totalItems})...`);
    });

    // 8. Marcar sincronização completa no localStorage
    try {
      localStorage.setItem('kyvra_offline_synced', 'true');
      localStorage.setItem('kyvra_offline_sync_time', String(Date.now()));
      localStorage.setItem('kyvra_offline_items_count', String(totalItems));
    } catch (e) {}

    if (onProgress) {
      onProgress({
        total: totalItems,
        current: totalItems,
        label: 'Kyvra pronta para uso 100% offline!'
      });
    }

    await stopPerformanceTrace('offline_full_sync_latency', { total_items: totalItems });
    return true;
  } catch (error) {
    await stopPerformanceTrace('offline_full_sync_latency', { success: 0 });
    console.error('Erro ao sincronizar recursos para offline:', error);
    return false;
  }
}

