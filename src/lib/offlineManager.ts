import { supabase } from './supabase';
import { saveForOffline } from './utils';

export interface OfflineProgress {
  total: number;
  current: number;
  label: string;
}

export async function syncEverythingForOffline(onProgress?: (progress: OfflineProgress) => void) {
  try {
    // 1. Fetch everything that has assets and also pre-populate API cache
    const [
      { data: tracks },
      { data: albums },
      { data: lore }
    ] = await Promise.all([
      supabase.from('tracks').select('*, albums(title, cover_url)').order('created_at', { ascending: false }),
      supabase.from('albums').select('*').order('created_at', { ascending: false }),
      supabase.from('lore_chapters').select('*').order('chapter_number', { ascending: true })
    ]);

    const urlsToCache = new Set<string>();

    tracks?.forEach(t => { 
      if (t.audio_url) urlsToCache.add(t.audio_url);
      if (t.albums?.cover_url) urlsToCache.add(t.albums.cover_url);
    });
    albums?.forEach(a => { if (a.cover_url) urlsToCache.add(a.cover_url); });
    lore?.forEach(l => { if (l.image_url) urlsToCache.add(l.image_url); });

    const total = urlsToCache.size;
    let current = 0;

    const urlArray = Array.from(urlsToCache);
    
    // Process in small batches to not overwhelm the browser
    const batchSize = 3;
    for (let i = 0; i < urlArray.length; i += batchSize) {
      const batch = urlArray.slice(i, i + batchSize);
      await Promise.all(batch.map(async (url) => {
        await saveForOffline(url);
        current++;
        if (onProgress) {
          onProgress({
            total,
            current,
            label: `Baixando arquivos... (${current}/${total})`
          });
        }
      }));
    }

    return true;
  } catch (error) {
    console.error('Error syncing for offline:', error);
    return false;
  }
}
