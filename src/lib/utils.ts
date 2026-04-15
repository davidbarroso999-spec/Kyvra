import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function saveForOffline(url: string): Promise<boolean> {
  try {
    const cache = await caches.open('supabase-storage-cache');
    const response = await cache.match(url);
    if (!response) {
      await cache.add(url);
    }
    return true;
  } catch (error) {
    console.error('Error saving for offline:', error);
    return false;
  }
}

export async function isSavedOffline(url: string): Promise<boolean> {
  try {
    const cache = await caches.open('supabase-storage-cache');
    const response = await cache.match(url);
    return !!response;
  } catch (error) {
    return false;
  }
}
