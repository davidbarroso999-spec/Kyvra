import { registerPlugin, Capacitor } from '@capacitor/core';

export interface StorageInfo {
  packageName: string;
  packagePath: string;
  filesDir: string;
  cacheDir: string;
  cacheSizeBytes: number;
  cacheSizeMB: string;
  freeSpaceMB: string;
}

export interface KyvraStoragePlugin {
  getStorageInfo(): Promise<StorageInfo>;
  clearCache(): Promise<{ status: string; success: boolean }>;
}

const KyvraStorage = registerPlugin<KyvraStoragePlugin>('KyvraStorage');

/**
 * Retorna os detalhes de armazenamento do diretório com.kyvra.app no dispositivo Android
 */
export async function getAppStorageInfo(): Promise<StorageInfo> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      return await KyvraStorage.getStorageInfo();
    } catch (e) {
      console.warn('Erro ao consultar KyvraStorage nativo:', e);
    }
  }

  // Fallback simulado para ambiente Web
  return {
    packageName: 'com.kyvra.app',
    packagePath: '/storage/emulated/0/Android/data/com.kyvra.app',
    filesDir: '/storage/emulated/0/Android/data/com.kyvra.app/files',
    cacheDir: '/storage/emulated/0/Android/data/com.kyvra.app/cache',
    cacheSizeBytes: 0,
    cacheSizeMB: '0.00 MB',
    freeSpaceMB: 'Disponível via Navegador',
  };
}

/**
 * Limpa o cache acumulado na pasta Android/data/com.kyvra.app/cache/
 */
export async function clearAppCache(): Promise<boolean> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const res = await KyvraStorage.clearCache();
      return res.success;
    } catch (e) {
      console.error('Erro ao limpar cache nativo com.kyvra.app:', e);
      return false;
    }
  }

  return true;
}
