/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';

export interface DailyVisit {
  date: string; // YYYY-MM-DD
  visits: number;
  uniqueVisitors: number;
}

export interface PageStat {
  path: string;
  name: string;
  visits: number;
}

export interface TrackPlayStat {
  id?: string;
  title: string;
  artist: string;
  plays: number;
}

export interface AnalyticsData {
  totalVisits: number;
  uniqueVisitors: number;
  totalTrackPlays: number;
  launchDate: string;
  dailyVisits: DailyVisit[];
  pages: PageStat[];
  tracks: TrackPlayStat[];
  lastUpdated?: string;
}

interface RawCloudAnalytics {
  totalVisits: number;
  uniqueVisitors: number;
  totalTrackPlays: number;
  launchDate: string;
  tracks: Record<string, number>; // title/id -> count
  pages: Record<string, number>;  // path -> count
  daily: Record<string, { visits: number; uniqueVisitors: number }>; // date -> stats
}

const STORAGE_KEY = 'kyvra_site_analytics_real_v2';
const VISITOR_UUID_KEY = 'kyvra_device_visitor_id';
const OLD_STORAGE_KEY = 'kyvra_site_analytics_v1';
const SUPABASE_LORE_TITLE = '__SITE_ANALYTICS_V1__';

// Remove dados antigos simulados se existirem no navegador
try {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(OLD_STORAGE_KEY)) {
    localStorage.removeItem(OLD_STORAGE_KEY);
  }
} catch {
  // Ignora falhas de storage
}

// Obtém ou gera ID único do dispositivo/visitante
function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_UUID_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `vis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(VISITOR_UUID_KEY, id);
    }
    return id;
  } catch {
    return 'temp_device';
  }
}

const PAGE_NAMES: Record<string, string> = {
  '/': 'Início (Home)',
  '/arquivo': 'Acervo Geral (Músicas)',
  '/reliquias': 'Relíquias (Álbuns & EPs)',
  '/cosmogonia': 'Cosmogonia (Lore)',
  '/arquivista': 'O Arquivista (Painel)',
};

function getCleanInitialState(): AnalyticsData {
  return {
    totalVisits: 0,
    uniqueVisitors: 0,
    totalTrackPlays: 0,
    launchDate: '2024-11-01',
    dailyVisits: [],
    pages: [
      { path: '/', name: PAGE_NAMES['/'], visits: 0 },
      { path: '/arquivo', name: PAGE_NAMES['/arquivo'], visits: 0 },
      { path: '/reliquias', name: PAGE_NAMES['/reliquias'], visits: 0 },
      { path: '/cosmogonia', name: PAGE_NAMES['/cosmogonia'], visits: 0 },
      { path: '/arquivista', name: PAGE_NAMES['/arquivista'], visits: 0 },
    ],
    tracks: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function getAnalyticsData(): AnalyticsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return getCleanInitialState();
}

export function saveLocalAnalyticsData(data: AnalyticsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Falha ao salvar dados de analytics locais:", e);
  }
}

// Fila em memória para envio com throttle ao Supabase
let pendingVisitsDelta = 0;
let pendingUniqueDelta = 0;
let pendingPageHits: Record<string, number> = {};
let pendingTrackHits: Record<string, number> = {};
let syncTimeout: any = null;

async function syncWithCloud(): Promise<void> {
  if (
    pendingVisitsDelta === 0 &&
    pendingUniqueDelta === 0 &&
    Object.keys(pendingPageHits).length === 0 &&
    Object.keys(pendingTrackHits).length === 0
  ) {
    return;
  }

  const visitsToAdd = pendingVisitsDelta;
  const uniquesToAdd = pendingUniqueDelta;
  const pageHits = { ...pendingPageHits };
  const trackHits = { ...pendingTrackHits };

  // Limpa os acumuladores pendentes
  pendingVisitsDelta = 0;
  pendingUniqueDelta = 0;
  pendingPageHits = {};
  pendingTrackHits = {};

  try {
    const { data: existingRows, error: fetchErr } = await supabase
      .from('lore_chapters')
      .select('id, content')
      .eq('title', SUPABASE_LORE_TITLE)
      .limit(1);

    if (fetchErr) {
      console.warn("Analytics: Falha ao buscar dados em nuvem:", fetchErr);
      return;
    }

    let cloudData: RawCloudAnalytics = {
      totalVisits: 0,
      uniqueVisitors: 0,
      totalTrackPlays: 0,
      launchDate: '2024-11-01',
      tracks: {},
      pages: {},
      daily: {},
    };

    let recordId: string | null = null;

    if (existingRows && existingRows.length > 0) {
      recordId = existingRows[0].id;
      try {
        if (existingRows[0].content) {
          cloudData = JSON.parse(existingRows[0].content);
        }
      } catch {
        // use default
      }
    }

    cloudData.totalVisits = (cloudData.totalVisits || 0) + visitsToAdd;
    cloudData.uniqueVisitors = (cloudData.uniqueVisitors || 0) + uniquesToAdd;

    // Atualiza contadores de páginas
    cloudData.pages = cloudData.pages || {};
    for (const [path, count] of Object.entries(pageHits)) {
      cloudData.pages[path] = (cloudData.pages[path] || 0) + count;
    }

    // Atualiza contadores de tracks
    cloudData.tracks = cloudData.tracks || {};
    let trackPlaysDelta = 0;
    for (const [title, count] of Object.entries(trackHits)) {
      cloudData.tracks[title] = (cloudData.tracks[title] || 0) + count;
      trackPlaysDelta += count;
    }
    cloudData.totalTrackPlays = (cloudData.totalTrackPlays || 0) + trackPlaysDelta;

    // Atualiza contagem diária
    const todayStr = new Date().toISOString().split('T')[0];
    cloudData.daily = cloudData.daily || {};
    if (!cloudData.daily[todayStr]) {
      cloudData.daily[todayStr] = { visits: 0, uniqueVisitors: 0 };
    }
    cloudData.daily[todayStr].visits += visitsToAdd;
    cloudData.daily[todayStr].uniqueVisitors += uniquesToAdd;

    const payload = JSON.stringify(cloudData);

    if (recordId) {
      await supabase
        .from('lore_chapters')
        .update({ content: payload })
        .eq('id', recordId);
    } else {
      await supabase
        .from('lore_chapters')
        .insert({
          title: SUPABASE_LORE_TITLE,
          content: payload,
          chapter_number: '99999'
        });
    }
  } catch (err) {
    console.warn("Analytics: Falha na sincronização em nuvem:", err);
  }
}

function scheduleCloudSync(): void {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    void syncWithCloud();
  }, 3000);
}

export function recordVisit(pathname: string): void {
  try {
    const data = getAnalyticsData();
    data.totalVisits += 1;
    pendingVisitsDelta += 1;

    // Checagem de visitante único
    getVisitorId();
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionDailyKey = `kyvra_vis_day_${todayStr}`;
    let isDailyUnique = false;

    if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(sessionDailyKey)) {
      sessionStorage.setItem(sessionDailyKey, 'true');
      isDailyUnique = true;
    }

    const deviceFirstSeenKey = 'kyvra_first_seen_device';
    if (!localStorage.getItem(deviceFirstSeenKey)) {
      localStorage.setItem(deviceFirstSeenKey, todayStr);
      data.uniqueVisitors += 1;
      pendingUniqueDelta += 1;
    }

    // Registro na data diária
    let todayEntry = data.dailyVisits.find(d => d.date === todayStr);
    if (!todayEntry) {
      todayEntry = { date: todayStr, visits: 0, uniqueVisitors: 0 };
      data.dailyVisits.push(todayEntry);
    }
    todayEntry.visits += 1;
    if (isDailyUnique) {
      todayEntry.uniqueVisitors += 1;
    }

    // Registro na página acessada
    // Normaliza rotas dinâmicas como /reliquias/:id
    const normalizedPath = pathname.startsWith('/reliquias/') ? '/reliquias' : pathname;
    const pageName = PAGE_NAMES[normalizedPath] || normalizedPath;
    let pageEntry = data.pages.find(p => p.path === normalizedPath);
    if (!pageEntry) {
      pageEntry = { path: normalizedPath, name: pageName, visits: 0 };
      data.pages.push(pageEntry);
    }
    pageEntry.visits += 1;
    pendingPageHits[normalizedPath] = (pendingPageHits[normalizedPath] || 0) + 1;

    data.lastUpdated = new Date().toISOString();
    saveLocalAnalyticsData(data);
    scheduleCloudSync();
  } catch (e) {
    console.error("Erro ao registrar visita real:", e);
  }
}

export function recordTrackPlay(trackTitle: string, artist = 'Kyvra', trackId?: string): void {
  try {
    if (!trackTitle) return;
    const data = getAnalyticsData();
    data.totalTrackPlays += 1;

    let trackEntry = data.tracks.find(t => t.title.toLowerCase().trim() === trackTitle.toLowerCase().trim());
    if (trackEntry) {
      trackEntry.plays += 1;
    } else {
      trackEntry = {
        id: trackId,
        title: trackTitle,
        artist: artist || 'Kyvra',
        plays: 1
      };
      data.tracks.push(trackEntry);
    }

    pendingTrackHits[trackTitle] = (pendingTrackHits[trackTitle] || 0) + 1;

    data.lastUpdated = new Date().toISOString();
    saveLocalAnalyticsData(data);
    scheduleCloudSync();
  } catch (e) {
    console.error("Erro ao registrar reprodução real:", e);
  }
}

/**
 * Busca todas as informações reais sincronizadas na nuvem (Supabase)
 * e mescla com a lista completa de músicas cadastradas no banco de dados.
 */
export async function fetchRealAnalyticsData(): Promise<AnalyticsData> {
  const localData = getAnalyticsData();

  try {
    // 1. Busca dados do Supabase lore_chapters
    const { data: cloudRows } = await supabase
      .from('lore_chapters')
      .select('content')
      .eq('title', SUPABASE_LORE_TITLE)
      .limit(1);

    let cloudData: RawCloudAnalytics | null = null;
    if (cloudRows && cloudRows.length > 0 && cloudRows[0].content) {
      try {
        cloudData = JSON.parse(cloudRows[0].content);
      } catch {
        // ignore parse error
      }
    }

    // 2. Busca lista de todas as músicas reais cadastradas no banco
    const { data: dbTracks } = await supabase
      .from('tracks')
      .select('id, title, artist')
      .order('title', { ascending: true });

    const totalVisits = Math.max(cloudData?.totalVisits || 0, localData.totalVisits);
    const uniqueVisitors = Math.max(cloudData?.uniqueVisitors || 0, localData.uniqueVisitors);
    const totalTrackPlays = Math.max(cloudData?.totalTrackPlays || 0, localData.totalTrackPlays);

    // Mapeamento de páginas reais
    const pageStats: PageStat[] = Object.keys(PAGE_NAMES).map(path => {
      const cloudVisits = cloudData?.pages?.[path] || 0;
      const localVisits = localData.pages.find(p => p.path === path)?.visits || 0;
      return {
        path,
        name: PAGE_NAMES[path],
        visits: Math.max(cloudVisits, localVisits),
      };
    });

    // Mapeamento de histórico diário real
    const dailyMap: Record<string, { visits: number; uniqueVisitors: number }> = {};
    if (cloudData?.daily) {
      for (const [date, stats] of Object.entries(cloudData.daily)) {
        dailyMap[date] = { ...stats };
      }
    }
    for (const d of localData.dailyVisits) {
      if (!dailyMap[d.date]) {
        dailyMap[d.date] = { visits: d.visits, uniqueVisitors: d.uniqueVisitors };
      } else {
        dailyMap[d.date].visits = Math.max(dailyMap[d.date].visits, d.visits);
        dailyMap[d.date].uniqueVisitors = Math.max(dailyMap[d.date].uniqueVisitors, d.uniqueVisitors);
      }
    }

    const dailyVisits: DailyVisit[] = Object.entries(dailyMap)
      .map(([date, stats]) => ({
        date,
        visits: stats.visits,
        uniqueVisitors: stats.uniqueVisitors,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Mapeamento de músicas reais (todas do banco)
    const tracksMap: Record<string, TrackPlayStat> = {};
    
    // Inicia com as músicas reais do banco
    if (dbTracks && dbTracks.length > 0) {
      for (const t of dbTracks) {
        const cleanTitle = t.title.trim();
        const cloudCount = cloudData?.tracks?.[cleanTitle] || cloudData?.tracks?.[t.title] || 0;
        const localTrack = localData.tracks.find(lt => lt.title.toLowerCase().trim() === cleanTitle.toLowerCase());
        const localCount = localTrack?.plays || 0;
        tracksMap[cleanTitle.toLowerCase()] = {
          id: t.id,
          title: cleanTitle,
          artist: t.artist || 'Kyvra',
          plays: Math.max(cloudCount, localCount),
        };
      }
    }

    // Adiciona faixas locais que porventura foram tocadas
    for (const lt of localData.tracks) {
      const key = lt.title.toLowerCase().trim();
      if (!tracksMap[key]) {
        tracksMap[key] = {
          id: lt.id,
          title: lt.title,
          artist: lt.artist,
          plays: lt.plays,
        };
      }
    }

    const tracksList = Object.values(tracksMap).sort((a, b) => b.plays - a.plays);

    const mergedData: AnalyticsData = {
      totalVisits,
      uniqueVisitors,
      totalTrackPlays,
      launchDate: cloudData?.launchDate || '2024-11-01',
      dailyVisits,
      pages: pageStats,
      tracks: tracksList,
      lastUpdated: new Date().toISOString(),
    };

    saveLocalAnalyticsData(mergedData);
    return mergedData;
  } catch (e) {
    console.error("Erro ao buscar analytics real:", e);
    return localData;
  }
}

/**
 * Zera e recalibra todas as métricas reais para início de novo ciclo de rastreio limpo
 */
export async function resetRealAnalytics(): Promise<void> {
  const clean = getCleanInitialState();
  saveLocalAnalyticsData(clean);

  try {
    const cleanPayload: RawCloudAnalytics = {
      totalVisits: 0,
      uniqueVisitors: 0,
      totalTrackPlays: 0,
      launchDate: '2024-11-01',
      tracks: {},
      pages: {},
      daily: {},
    };

    await supabase
      .from('lore_chapters')
      .update({ content: JSON.stringify(cleanPayload) })
      .eq('title', SUPABASE_LORE_TITLE);
  } catch (e) {
    console.warn("Falha ao resetar nuvem:", e);
  }
}
