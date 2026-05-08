import { supabase } from './supabase';
import { parseChapterNumber } from './utils';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 15; // 15 minutos

export async function fetchWithCache(key: string, fetcher: () => Promise<any>, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { data: cached.data, error: null };
    }
  }

  const response = await fetcher();
  const { data, error } = response;
  
  if (!error && data) {
    cache.set(key, { data, timestamp: Date.now() });
  }
  
  return response;
}

export function clearCache(keyPrefix?: string) {
  if (!keyPrefix) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.startsWith(keyPrefix)) cache.delete(key);
    }
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
