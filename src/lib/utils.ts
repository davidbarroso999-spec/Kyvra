import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// CACHE STORAGE IMPLEMENTATION FOR PURE WEB
const AUDIO_CACHE = 'kyvra-audio-cache';

export async function saveForOffline(url: string): Promise<boolean> {
  if (!url) return false;
  
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const existing = await cache.match(url);
    if (existing) return true;

    // Use manual fetch instead of cache.add() to explicitly manage the network request,
    // enforce CORS, and bypass problematic browser-level caches.
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',           // Ensures we get a readable response (not opaque) for blob conversion later
      cache: 'no-store'       // Force a clean fetch from the remote server
    });

    if (!response.ok && response.type !== 'opaque') {
      throw new Error(`Failed to fetch file: HTTP ${response.status}`);
    }

    // We must clone the response because cache.put consumes the stream body
    await cache.put(url, response.clone());
    return true;
  } catch (error) {
    console.error('Error with standard fetch, trying no-cors fallback...', error);
    try {
      const cache = await caches.open(AUDIO_CACHE);
      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors'
      });
      await cache.put(url, response.clone());
      return true;
    } catch (fallbackError) {
      console.error('Fatal crash on offline caching:', fallbackError);
      return false;
    }
  }
}

export async function isSavedOffline(url: string): Promise<boolean> {
  if (!url) return false;
  
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const response = await cache.match(url);
    return !!response;
  } catch (error) {
    return false;
  }
}

export async function getOfflineUrl(url: string): Promise<string> {
  if (!url) return url;
  
  try {
    // Check if we hit cache
    const cache = await caches.open(AUDIO_CACHE);
    const response = await cache.match(url);
    if (response) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
    return url; // fallback to generic network request if not cached
  } catch (e) {
    return url;
  }
}
