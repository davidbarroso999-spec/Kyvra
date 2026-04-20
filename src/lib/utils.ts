import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to get safe filename from URL
function getFilenameFromUrl(url: string) {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    const file = parts[parts.length - 1];
    return decodeURIComponent(file);
  } catch (e) {
    return `kyvra-cache-${Date.now()}`;
  }
}

export async function saveForOffline(url: string): Promise<boolean> {
  if (!url) return false;
  
  try {
    if (Capacitor.isNativePlatform()) {
      // True native offline saving via Filesystem
      const filename = getFilenameFromUrl(url);
      
      // Check if already exists
      try {
        await Filesystem.stat({
          path: `downloadToCache/${filename}`,
          directory: Directory.Data
        });
        return true; // Already saved
      } catch (e) {
        // Doesn't exist, proceed to save. Since downloading directly to file is available in Capacitor:
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Convert blob to base64
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        await Filesystem.writeFile({
          path: `downloadToCache/${filename}`,
          data: base64Data as string,
          directory: Directory.Data,
          recursive: true
        });
        return true;
      }
    } else {
      // Web fallback
      const cache = await caches.open('supabase-storage-cache');
      const response = await cache.match(url);
      if (!response) {
        await cache.add(url);
      }
      return true;
    }
  } catch (error) {
    console.error('Error saving for offline:', error);
    return false;
  }
}

export async function isSavedOffline(url: string): Promise<boolean> {
  if (!url) return false;
  
  try {
    if (Capacitor.isNativePlatform()) {
      const filename = getFilenameFromUrl(url);
      try {
        await Filesystem.stat({
          path: `downloadToCache/${filename}`,
          directory: Directory.Data
        });
        return true;
      } catch (e) {
        return false;
      }
    } else {
      const cache = await caches.open('supabase-storage-cache');
      const response = await cache.match(url);
      return !!response;
    }
  } catch (error) {
    return false;
  }
}

export async function getOfflineUrl(url: string): Promise<string> {
  if (!url) return url;
  
  if (Capacitor.isNativePlatform()) {
    try {
      const filename = getFilenameFromUrl(url);
      const stat = await Filesystem.stat({
        path: `downloadToCache/${filename}`,
        directory: Directory.Data
      });
      const localUri = Capacitor.convertFileSrc(stat.uri);
      return localUri;
    } catch (e) {
      return url; // Fallback to network URL if not offline
    }
  }
  return url;
}
