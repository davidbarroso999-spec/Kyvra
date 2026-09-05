import { registerPlugin } from '@capacitor/core';

export interface KyvraPerformancePlugin {
  startTrace(options: { traceName: string }): Promise<{ status: string; traceName: string }>;
  stopTrace(options: { traceName: string; metrics?: Record<string, number> }): Promise<{ status: string; traceName: string }>;
  recordNetworkMetric(options: {
    url: string;
    httpMethod?: string;
    responseCode?: number;
    durationMs?: number;
    responsePayloadBytes?: number;
  }): Promise<{ status: string }>;
}

const KyvraPerformance = registerPlugin<KyvraPerformancePlugin>('KyvraPerformance');

const activeWebTraces = new Map<string, number>();

/**
 * Inicia uma medição de desempenho no Firebase Performance Monitoring (Android)
 * ou na Web Performance API.
 */
export async function startPerformanceTrace(traceName: string): Promise<void> {
  try {
    await KyvraPerformance.startTrace({ traceName });
  } catch (_err) {
    // Fallback para Web Performance API
    activeWebTraces.set(traceName, performance.now());
  }
}

/**
 * Finaliza uma medição de desempenho e registra métricas adicionais de latência/carregamento.
 */
export async function stopPerformanceTrace(
  traceName: string,
  metrics?: Record<string, number>
): Promise<number | null> {
  let durationMs: number | null = null;
  
  try {
    await KyvraPerformance.stopTrace({ traceName, metrics });
  } catch (_err) {
    const startTime = activeWebTraces.get(traceName);
    if (startTime !== undefined) {
      durationMs = Math.round(performance.now() - startTime);
      activeWebTraces.delete(traceName);
    }
  }

  return durationMs;
}

/**
 * Registra latência de rede individual para requisições críticas (Supabase, áudios, imagens).
 */
export async function recordNetworkLatency(
  url: string,
  options: {
    httpMethod?: string;
    responseCode?: number;
    durationMs: number;
    responsePayloadBytes?: number;
  }
): Promise<void> {
  try {
    await KyvraPerformance.recordNetworkMetric({
      url,
      httpMethod: options.httpMethod || 'GET',
      responseCode: options.responseCode || 200,
      durationMs: options.durationMs,
      responsePayloadBytes: options.responsePayloadBytes || 0,
    });
  } catch (_err) {
    // Silencioso se não estiver em ambiente nativo
  }
}

// Inicia automaticamente o rastreamento do tempo de inicialização da interface crítica
if (typeof window !== 'undefined') {
  startPerformanceTrace('app_initial_ui_render');

  window.addEventListener('load', () => {
    setTimeout(() => {
      stopPerformanceTrace('app_initial_ui_render');
    }, 100);
  });
}
