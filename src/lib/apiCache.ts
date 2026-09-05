import { supabase } from './supabase';
import { parseChapterNumber, getOptimizedImageUrl } from './utils';
import { recordNetworkLatency } from './performance';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 60 minutos em memória
const LOCAL_STORAGE_PREFIX = 'kyvra_api_cache_';

export async function fetchWithCache(key: string, fetcher: () => Promise<any>, forceRefresh = false) {
  // 1. Verificar cache em memória RAM rápido
  if (!forceRefresh) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { data: cached.data, error: null };
    }
  }

  // 2. Se offline, tentar imediatamente ler do localStorage
  if (typeof navigator !== 'undefined' && !navigator.onLine && !forceRefresh) {
    try {
      const persisted = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        cache.set(key, parsed);
        return { data: parsed.data, error: null };
      }
    } catch (e) {}
  }

  // 3. Executar fetch na rede
  const startTime = performance.now();
  try {
    const response = await fetcher();
    const durationMs = Math.round(performance.now() - startTime);
    const { data, error } = response || {};
    
    recordNetworkLatency(`supabase_api://${key}`, {
      httpMethod: 'GET',
      responseCode: error ? 500 : 200,
      durationMs,
      responsePayloadBytes: data ? JSON.stringify(data).length : 0,
    });
    
    if (!error && data !== undefined && data !== null) {
      const cacheObj = { data, timestamp: Date.now() };
      cache.set(key, cacheObj);
      try {
        localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(cacheObj));
      } catch (e) {
        // quota excedida em modo estrito — continua silenciosamente
      }
      return response;
    }

    // Se a query retornou erro de rede/servidor, tenta fallback do localStorage
    try {
      const persisted = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        cache.set(key, parsed);
        return { data: parsed.data, error: null };
      }
    } catch (e) {}

    return response;
  } catch (err) {
    // Falha de conexão de rede -> Recupera do storage persistido
    try {
      const persisted = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        cache.set(key, parsed);
        return { data: parsed.data, error: null };
      }
    } catch (e) {}
    
    return { data: null, error: err };
  }
}

export function clearCache(keyPrefix?: string) {
  if (!keyPrefix) {
    cache.clear();
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(LOCAL_STORAGE_PREFIX)) localStorage.removeItem(k);
      });
    } catch (e) {}
  } else {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) cache.delete(key);
    }
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(LOCAL_STORAGE_PREFIX + keyPrefix)) localStorage.removeItem(k);
      });
    } catch (e) {}
  }
}

// Queries Pre-definidas:

export async function getLoreChapters(force = false) {
  return fetchWithCache('lore_chapters', async () => {
    const response = await supabase.from('lore_chapters').select('*');
    if (response.data) {
      response.data.sort((a, b) => parseChapterNumber(a.chapter_number) - parseChapterNumber(b.chapter_number));
    }
    return response;
  }, force);
}

export async function getAlbums(force = false) {
  return fetchWithCache('albums', async () => await supabase.from('albums').select('*, tracks(count)').order('created_at', { ascending: false }), force);
}

export async function getAlbumWithTracks(id: string, force = false) {
  return fetchWithCache(`album_${id}`, async () => await supabase.from('albums').select('*, tracks(*)').eq('id', id).single(), force);
}

export async function getAllTracks(force = false) {
  return fetchWithCache('all_tracks', async () => await supabase.from('tracks').select('*, albums(title, cover_url)').order('created_at', { ascending: false }), force);
}

export async function getFeaturedTracksSettings(force = false) {
  return fetchWithCache('featured_settings', async () => {
    // Busca __FEATURED_TRACKS_JSON__
    const { data: setList, error } = await supabase
      .from('lore_chapters')
      .select('content')
      .eq('title', '__FEATURED_TRACKS_JSON__')
      .order('id', { ascending: false })
      .limit(1);
      
    if (error) return { data: null, error };
    
    let trackIds: string[] = [];
    if (setList?.[0]?.content) {
      try {
        trackIds = JSON.parse(setList[0].content);
      } catch (e) {
        console.error("Error parsing JSON", e);
      }
    }
    
    // Fallback para __FEATURED_TRACK__
    if (trackIds.length === 0) {
      const { data: oldList } = await supabase
        .from('lore_chapters')
        .select('content')
        .eq('title', '__FEATURED_TRACK__')
        .order('id', { ascending: false })
        .limit(1);
      if (oldList?.[0]?.content) {
        trackIds = [oldList[0].content];
      }
    }
    
    return { data: trackIds };
  }, force);
}

export async function getTracksByIds(ids: string[], force = false) {
  const keyStr = ids.slice().sort().join(',');
  return fetchWithCache(`tracks_by_ids_${keyStr}`, async () => await supabase
    .from('tracks')
    .select('*, albums(title, cover_url)')
    .in('id', ids)
  , force);
}

export async function getTrackSynopses(trackIds: string[], force = false) {
  const synopsisTitles = trackIds.map((id) => `__SYNOPSIS_${id}__`);
  synopsisTitles.push('__FEATURED_TRACK_SYNOPSIS__');
  const keyStr = synopsisTitles.slice().sort().join(',');
  
  return fetchWithCache(`synopses_${keyStr}`, async () => await supabase
    .from('lore_chapters')
    .select('title, content')
    .in('title', synopsisTitles), force);
}

export async function getFeaturedFragmentData() {
  try {
    // Reutiliza a query estável de todas as faixas (já persistida e offline-ready)
    const { data: allTracks } = await getAllTracks();

    if (allTracks && allTracks.length > 0) {
      // Calculate a consistently changing index every 10 days
      const daysSinceEpoch = Math.floor(Date.now() / 86400000);
      const cycle10Days = Math.floor(daysSinceEpoch / 10);
      
      // Simple pseudo-random using cycle10Days as a seed
      // For more randomization we can multiply with a prime
      const randomIndex = (cycle10Days * 17 + 13) % allTracks.length;
      const track = allTracks[randomIndex];

      return {
        id: String(track.id),
        title: track.title,
        artist: track.artist || 'Kyvra',
        vibe: track.vibe || 'Intuitivo',
        duration: track.duration || '0:00',
        coverUrl: getOptimizedImageUrl(track.albums?.cover_url || '', 800, 75),
        audioUrl: track.audio_url,
        narrativeNote: 'Esta é a recomendação periódica do abismo, um fragmento selecionado por forças além da nossa compreensão. A cada ciclo de 10 dias, os ventos cósmicos trazem uma nova vibração à tona.',
        loreConnection: 'Essa recomendação abre portas para reinterpretar os símbolos perdidos da cosmogonia de Kyvra.',
      };
    }

    return null;
  } catch (err) {
    console.error('Error fetching featured fragment:', err);
    return null;
  }
}

