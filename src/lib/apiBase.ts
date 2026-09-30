import { Capacitor } from '@capacitor/core';

const nativeApiBaseUrl = import.meta.env.VITE_NATIVE_API_URL?.trim() || '';

export function apiUrl(path: string): string {
  const route = path.startsWith('/') ? path : `/${path}`;
  if (!Capacitor.isNativePlatform()) return route;

  if (!nativeApiBaseUrl) {
    throw new Error(
      'A API do Kyvra não foi configurada para esta versão Android. Defina VITE_NATIVE_API_URL e gere o APK novamente.',
    );
  }

  let base: URL;
  try {
    base = new URL(nativeApiBaseUrl);
  } catch {
    throw new Error('VITE_NATIVE_API_URL precisa ser uma URL HTTPS válida.');
  }

  if (base.protocol !== 'https:') {
    throw new Error('VITE_NATIVE_API_URL precisa usar HTTPS.');
  }
  if (base.username || base.password || base.search || base.hash) {
    throw new Error('VITE_NATIVE_API_URL deve conter somente a origem/base HTTPS da API.');
  }

  const basePath = base.pathname.replace(/\/+$/, '');
  return `${base.origin}${basePath}${route}`;
}
