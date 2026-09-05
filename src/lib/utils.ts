import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Encaminha URLs de imagens (como capas do Supabase) para o CDN WSRV
 * Acelera drasticamente o carregamento usando formato WebP e re-escala sob demanda.
 */
export function getOptimizedImageUrl(url: string, width: number = 800, quality: number = 75): string {
  // Rollback do CDN WSRV temporariamente para contornar rate-limits
  return url;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("Clipboard API falhou, tentando fallback", err);
  }

  // Fallback para execCommand (útil em iframes sem permissão ou contextos não seguros)
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    textArea.remove();
    return successful;
  } catch (err) {
    console.error("Fallback de clipboard falhou", err);
    return false;
  }
}

export function parseChapterNumber(chapter: any): number {
  if (chapter === null || chapter === undefined) return 999999;
  const str = String(chapter).trim();
  if (/^-?\d+$/.test(str)) return parseInt(str, 10);
  
  const romanRegex = /^(M{0,3})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;
  if (str && str !== "" && romanRegex.test(str)) {
    const roman: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
    let res = 0;
    const s = str.toLowerCase();
    for (let i = 0; i < s.length; i++) {
      const current = roman[s[i]];
      const next = roman[s[i + 1]];
      if (next && current < next) {
        res -= current;
      } else {
        res += current;
      }
    }
    return res;
  }
  return 999999;
}

// CACHE STORAGE IMPLEMENTATION FOR PURE WEB
export const AUDIO_CACHE = 'kyvra-audio-cache';
export const FRAMES_CACHE = 'kyvra-frames-cache';

export async function saveForOffline(url: string, targetCache = AUDIO_CACHE): Promise<boolean> {
  if (!url) return false;
  if (typeof caches === 'undefined') return false;
  
  try {
    const cache = await caches.open(targetCache);
    const existing = await cache.match(url);
    if (existing) return true;

    // Use manual fetch instead of cache.add() to explicitly manage the network request,
    // enforce CORS, and bypass problematic browser-level caches.
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',           // Ensures we get a readable response for blob conversion later
      cache: 'no-store'       // Force a clean fetch from the remote server
    });

    if (!response.ok && response.type !== 'opaque') {
      throw new Error(`Failed to fetch file: HTTP ${response.status}`);
    }

    // We must clone the response because cache.put consumes the stream body
    await cache.put(url, response.clone());
    return true;
  } catch (error) {
    try {
      const cache = await caches.open(targetCache);
      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors'
      });
      await cache.put(url, response.clone());
      return true;
    } catch (fallbackError) {
      console.warn(`[KYVRA OFFLINE] Falha ao salvar recurso offline (${url}):`, fallbackError);
      return false;
    }
  }
}

export async function isSavedOffline(url: string): Promise<boolean> {
  if (!url || typeof caches === 'undefined') return false;
  
  try {
    const audioCache = await caches.open(AUDIO_CACHE);
    let response = await audioCache.match(url);
    if (response) return true;

    const framesCache = await caches.open(FRAMES_CACHE);
    response = await framesCache.match(url);
    if (response) return true;

    // Match global em todos os caches como fallback
    const globalMatch = await caches.match(url, { ignoreSearch: true });
    return !!globalMatch;
  } catch (error) {
    return false;
  }
}

export async function getOfflineUrl(url: string): Promise<string> {
  if (!url || typeof caches === 'undefined') return url;
  
  try {
    const audioCache = await caches.open(AUDIO_CACHE);
    let response = await audioCache.match(url);

    if (!response) {
      const framesCache = await caches.open(FRAMES_CACHE);
      response = await framesCache.match(url);
    }

    if (!response) {
      response = await caches.match(url, { ignoreSearch: true });
    }

    if (response) {
      try {
        const blob = await response.blob();
        if (blob && blob.size > 0) {
          return URL.createObjectURL(blob);
        }
      } catch (blobErr) {
        // Resposta opaca que não permite .blob() -> fallback para url original
        return url;
      }
    }
    return url;
  } catch (e) {
    return url;
  }
}

export function isAppSyncedOffline(): boolean {
  try {
    return localStorage.getItem('kyvra_offline_synced') === 'true';
  } catch (e) {
    return false;
  }
}
