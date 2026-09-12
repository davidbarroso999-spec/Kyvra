import { saveForOffline, AUDIO_CACHE, FRAMES_CACHE } from './utils';
import { startPerformanceTrace, stopPerformanceTrace } from './performance';
import {
  getAllTracks,
  getAlbums,
  getLoreChapters,
  getFeaturedTracksSettings,
  getAlbumWithTracks,
  getTrackSynopses,
} from './apiCache';
import { FRAME_COUNT, frameUrl } from './albumsFrameCache';
import { useStore } from '@/store/useStore';

export interface OfflineProgress {
  total: number;
  current: number;
  label: string;
  failed?: number;
}

interface DownloadBatchResult {
  completed: number;
  failed: number;
}

const SYNCED_KEY = 'kyvra_offline_synced';
const SYNC_TIME_KEY = 'kyvra_offline_sync_time';
const SYNC_ITEMS_KEY = 'kyvra_offline_items_count';

const THEME_VIDEOS = [
  'https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_abissal.webm',
  'https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_sanguededrago.webm',
  'https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_florestanegra.webm',
  'https://hntllxzoyfzsucpqcbdk.supabase.co/storage/v1/object/public/kyvra_images/HEROVIDEO/YouCut_monolito.webm',
];

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<boolean>,
  onItem?: (success: boolean) => void,
): Promise<DownloadBatchResult> {
  let index = 0;
  let completed = 0;
  let failed = 0;

  const workers = new Array(Math.min(concurrency, items.length)).fill(null).map(async () => {
    while (index < items.length) {
      const item = items[index++];
      let success = false;

      try {
        success = await task(item);
      } catch (_error) {
        success = false;
      }

      if (success) completed++;
      else failed++;
      onItem?.(success);
    }
  });

  await Promise.all(workers);
  return { completed, failed };
}

async function saveWithRetry(url: string, targetCache: string, retries = 2): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (await saveForOffline(url, targetCache)) return true;
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  return false;
}

function hasUsableData(result: { data: unknown; error: unknown }): boolean {
  return !result.error && result.data !== null && result.data !== undefined;
}

function markSyncIncomplete() {
  try {
    localStorage.removeItem(SYNCED_KEY);
  } catch (_error) {
    // Storage indisponível: a sincronização continua sendo considerada incompleta.
  }
}

let activeSyncPromise: Promise<boolean> | null = null;

async function syncEverythingForOfflineInternal(
  onProgress?: (progress: OfflineProgress) => void,
): Promise<boolean> {
  const reportProgress = (progress: OfflineProgress) => {
    useStore.getState().setOfflineSyncProgress({
      current: progress.current,
      total: progress.total,
      failed: progress.failed,
    });
    onProgress?.(progress);
  };

  await startPerformanceTrace('offline_full_sync_latency');

  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      markSyncIncomplete();
      useStore.getState().setOfflineSyncStatus('error');
      reportProgress({
        total: 1,
        current: 0,
        failed: 1,
        label: 'Conecte-se à internet para salvar o acervo offline.',
      });
      await stopPerformanceTrace('offline_full_sync_latency', { success: 0, offline: 1 });
      return false;
    }

    useStore.getState().setOfflineSyncStatus('syncing');
    reportProgress({
      total: 100,
      current: 5,
      label: 'Sincronizando catálogo, capítulos e destaques...',
    });

    const [tracksRes, albumsRes, loreRes, featuredRes] = await Promise.all([
      getAllTracks(true),
      getAlbums(true),
      getLoreChapters(true),
      getFeaturedTracksSettings(true),
    ]);

    const catalogIsAvailable =
      hasUsableData(tracksRes) &&
      hasUsableData(albumsRes) &&
      hasUsableData(loreRes) &&
      hasUsableData(featuredRes);

    if (!catalogIsAvailable) {
      markSyncIncomplete();
      reportProgress({
        total: 100,
        current: 0,
        failed: 1,
        label: 'Não foi possível atualizar o catálogo. Tente novamente.',
      });
      await stopPerformanceTrace('offline_full_sync_latency', { success: 0, catalog: 0 });
      return false;
    }

    const tracks = (tracksRes.data as any[]) || [];
    const albums = (albumsRes.data as any[]) || [];
    const lore = (loreRes.data as any[]) || [];

    const detailResults = await Promise.all(albums.map((album) => getAlbumWithTracks(String(album.id), true)));
    const detailsFailed = detailResults.filter((result) => !hasUsableData(result)).length;

    if (tracks.length > 0) {
      const synopsisResult = await getTrackSynopses(tracks.map((track) => String(track.id)), true);
      if (!hasUsableData(synopsisResult)) {
        markSyncIncomplete();
        reportProgress({
          total: 100,
          current: 15,
          failed: 1,
          label: 'Não foi possível salvar as sinopses do arquivo.',
        });
        await stopPerformanceTrace('offline_full_sync_latency', { success: 0, synopses: 0 });
        return false;
      }
    }

    reportProgress({
      total: 100,
      current: 15,
      failed: detailsFailed,
      label: 'Catálogo salvo. Preparando músicas, imagens e vídeos...',
    });

    const mediaUrls = new Set<string>();

    THEME_VIDEOS.forEach((url) => mediaUrls.add(url));

    tracks.forEach((track) => {
      if (track.audio_url) mediaUrls.add(track.audio_url);
      if (track.albums?.cover_url) mediaUrls.add(track.albums.cover_url);
    });

    albums.forEach((album) => {
      if (album.cover_url) mediaUrls.add(album.cover_url);
    });

    lore.forEach((chapter) => {
      if (chapter.image_url) mediaUrls.add(chapter.image_url);
    });

    const frameUrls = Array.from({ length: FRAME_COUNT }, (_, index) => frameUrl(index));
    const mediaArray = Array.from(mediaUrls);
    const totalItems = mediaArray.length + frameUrls.length;
    let processedCount = 0;
    let failedCount = detailsFailed;

    const notifyProgress = (label: string) => {
      reportProgress({
        total: totalItems,
        current: processedCount,
        failed: failedCount,
        label,
      });
    };

    const mediaResult = await runWithConcurrency(
      mediaArray,
      8,
      (url) => saveWithRetry(url, AUDIO_CACHE),
      (success) => {
        processedCount++;
        if (!success) failedCount++;
        notifyProgress(`Salvando músicas e atmosfera (${processedCount}/${totalItems})...`);
      },
    );

    const framesResult = await runWithConcurrency(
      frameUrls,
      10,
      (url) => saveWithRetry(url, FRAMES_CACHE),
      (success) => {
        processedCount++;
        if (!success) failedCount++;
        notifyProgress(`Armazenando a crônica visual (${processedCount}/${totalItems})...`);
      },
    );

    // As falhas já foram contabilizadas durante cada callback de progresso.
    // Mantemos os resultados nomeados para preservar a telemetria da etapa sem duplicar a contagem.
    void mediaResult;
    void framesResult;

    if (failedCount > 0 || processedCount < totalItems) {
      markSyncIncomplete();
      reportProgress({
        total: totalItems,
        current: processedCount,
        failed: failedCount,
        label: `${failedCount} recurso(s) não foram salvos. Toque para tentar novamente.`,
      });
      await stopPerformanceTrace('offline_full_sync_latency', {
        success: 0,
        total_items: totalItems,
        failed_items: failedCount,
      });
      return false;
    }

    try {
      localStorage.setItem(SYNCED_KEY, 'true');
      localStorage.setItem(SYNC_TIME_KEY, String(Date.now()));
      localStorage.setItem(SYNC_ITEMS_KEY, String(totalItems));
    } catch (_error) {
      // O Cache Storage continua válido mesmo se o marcador local não puder ser escrito.
    }

    reportProgress({
      total: totalItems,
      current: totalItems,
      failed: 0,
      label: 'Kyvra pronta para abrir e tocar sem internet.',
    });
    useStore.getState().setOfflineSyncStatus('done');

    await stopPerformanceTrace('offline_full_sync_latency', {
      success: 1,
      total_items: totalItems,
      failed_items: 0,
    });
    return true;
  } catch (error) {
    markSyncIncomplete();
    useStore.getState().setOfflineSyncStatus('error');
    await stopPerformanceTrace('offline_full_sync_latency', { success: 0 });
    console.error('Erro ao sincronizar recursos para offline:', error);
    reportProgress({
      total: 1,
      current: 0,
      failed: 1,
      label: 'A sincronização foi interrompida. Tente novamente.',
    });
    return false;
  }
}

export function syncEverythingForOffline(
  onProgress?: (progress: OfflineProgress) => void,
): Promise<boolean> {
  if (activeSyncPromise) return activeSyncPromise;

  activeSyncPromise = syncEverythingForOfflineInternal(onProgress).finally(() => {
    activeSyncPromise = null;
  });

  return activeSyncPromise;
}
