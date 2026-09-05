import { registerPlugin, Capacitor } from '@capacitor/core';

export interface KyvraCrashlyticsPlugin {
  log(options: { message: string }): Promise<{ status: string }>;
  recordException(options: { message: string; stack?: string }): Promise<{ status: string }>;
  setCustomKey(options: { key: string; value: string }): Promise<{ status: string }>;
  setUserId(options: { userId: string }): Promise<{ status: string }>;
  crash(): Promise<{ status: string }>;
}

const KyvraCrashlytics = registerPlugin<KyvraCrashlyticsPlugin>('KyvraCrashlytics');

const isNativeAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

/**
 * Registra um log de contexto (breadcrumb) no Firebase Crashlytics.
 */
export async function logCrashlyticsMessage(message: string): Promise<void> {
  if (isNativeAndroid()) {
    try {
      await KyvraCrashlytics.log({ message });
    } catch (_e) {
      // Ignorado
    }
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(`[Crashlytics Log]: ${message}`);
  }
}

/**
 * Registra uma exceção ou erro capturado sem interromper a aplicação (non-fatal error).
 */
export async function reportHandledError(error: Error | string, contextMessage?: string): Promise<void> {
  const message = typeof error === 'string' 
    ? error 
    : `${contextMessage ? `[${contextMessage}] ` : ''}${error.name || 'Error'}: ${error.message}`;
  const stack = typeof error === 'string' ? new Error().stack : error.stack;

  if (isNativeAndroid()) {
    try {
      await KyvraCrashlytics.recordException({
        message,
        stack: stack || '',
      });
    } catch (_e) {
      // Ignorado
    }
  } else if (process.env.NODE_ENV !== 'production') {
    console.debug(`[Handled Error Captured (Web Mode)]:`, message);
  }
}

/**
 * Define uma chave/propriedade customizada para facilitar a depuração no painel do Crashlytics.
 */
export async function setCrashlyticsKey(key: string, value: string): Promise<void> {
  if (isNativeAndroid()) {
    try {
      await KyvraCrashlytics.setCustomKey({ key, value });
    } catch (_e) {
      // Ignorado
    }
  }
}

/**
 * Define o identificador único do usuário no Crashlytics.
 */
export async function setCrashlyticsUserId(userId: string): Promise<void> {
  if (isNativeAndroid()) {
    try {
      await KyvraCrashlytics.setUserId({ userId });
    } catch (_e) {
      // Ignorado
    }
  }
}

/**
 * Força um erro de teste para validação do Firebase Crashlytics no Android.
 */
export async function triggerTestCrash(): Promise<void> {
  if (isNativeAndroid()) {
    await KyvraCrashlytics.crash();
  } else {
    throw new Error('Teste de erro intencional do Kyvra Crashlytics no ambiente Web');
  }
}

// Configura ouvintes globais para erros não tratados de JS/React no navegador
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Ignora erros de cancelamento de requisição ou recursos benignos
    const errMsg = String(event.message || '');
    if (errMsg.includes('ResizeObserver') || errMsg.includes('AbortError')) {
      return;
    }
    reportHandledError(event.error || event.message, 'Global Window Error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const errorMsg = reason ? String(reason.message || reason) : '';
    if (errorMsg.includes('AbortError') || errorMsg.includes('canceled')) {
      return;
    }
    reportHandledError(
      reason instanceof Error ? reason : String(reason || 'Unhandled Promise Rejection'),
      'Unhandled Promise Rejection'
    );
  });
}
