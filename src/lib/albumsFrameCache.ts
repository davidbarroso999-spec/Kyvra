// Gerenciador de cache ultra-eficiente em memória e rede para a sequência de frames de Álbuns
export const FRAME_COUNT = 165;
export const FRAME_BASE_URL = '/cdn/frames/frame_';

export function frameUrl(index: number): string {
  const padded = String(index + 1).padStart(3, '0');
  // Revertido para o GitHub Raw direto (Fastly). 
  // O wsrv.nl estava estrangulando as conexões ao receber 165 requests simultâneos.
  return `${FRAME_BASE_URL}${padded}.jpg`;
}

// Armazena referências leves de HTMLImageElement
// O browser descarta automaticamente as texturas não visíveis da VRAM sem estourar o heap do JS
const imageElements: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
let loadedCount = 0;
let isPreloading = false;
let isFullyLoaded = false;
const listeners = new Set<(loaded: number, total: number, isComplete: boolean) => void>();

export function getAlbumsImageElement(index: number): HTMLImageElement | null {
  if (index < 0 || index >= FRAME_COUNT) return null;
  
  // Se ainda não tiver sido instanciado, instancia sob demanda
  if (!imageElements[index]) {
    const img = new Image();
    img.decoding = 'async';
    img.src = frameUrl(index);
    imageElements[index] = img;
  }
  return imageElements[index];
}

export function getAlbumsFramesLoadedCount(): number {
  return loadedCount;
}

export function isAlbumsFramesComplete(): boolean {
  return isFullyLoaded;
}

export function subscribeToAlbumsFrames(
  callback: (loaded: number, total: number, isComplete: boolean) => void
): () => void {
  listeners.add(callback);
  callback(loadedCount, FRAME_COUNT, isFullyLoaded);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  const complete = loadedCount >= FRAME_COUNT;
  isFullyLoaded = complete;
  listeners.forEach((cb) => cb(loadedCount, FRAME_COUNT, complete));
}

/**
 * Pré-carrega todos os frames para o cache HTTP do navegador com concorrência controlada.
 * Utiliza instâncias leves de Image sem criar ImageBitmaps permanentes na VRAM.
 */
export function startPreloadingAlbumsFrames(
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  if (isFullyLoaded) {
    if (onProgress) onProgress(FRAME_COUNT, FRAME_COUNT);
    return Promise.resolve();
  }

  if (isPreloading) {
    return new Promise((resolve) => {
      const unsubscribe = subscribeToAlbumsFrames((loaded, total, complete) => {
        if (onProgress) onProgress(loaded, total);
        if (complete) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  isPreloading = true;

  return new Promise((resolve) => {
    let completed = 0;
    const CONCURRENCY = 6;
    let nextIndex = 0;

    const loadNext = () => {
      if (nextIndex >= FRAME_COUNT) return;
      const i = nextIndex++;

      if (imageElements[i] && imageElements[i]!.complete && imageElements[i]!.naturalWidth > 0) {
        completed++;
        loadedCount = completed;
        notifyListeners();
        if (onProgress) onProgress(loadedCount, FRAME_COUNT);
        if (completed === FRAME_COUNT) {
          isFullyLoaded = true;
          resolve();
        } else {
          loadNext();
        }
        return;
      }

      const img = new Image();
      img.decoding = 'async';

      const handleDone = () => {
        imageElements[i] = img;
        completed++;
        loadedCount = completed;
        notifyListeners();
        if (onProgress) onProgress(loadedCount, FRAME_COUNT);

        if (completed === FRAME_COUNT) {
          isFullyLoaded = true;
          resolve();
        } else {
          loadNext();
        }
      };

      img.onload = () => {
        // Força o decode em thread paralela ANTES de liberar o frame pro Canvas
        // Isso remove o engasgo no momento de fazer o scrub (onde o ctx.drawImage decodificaria bloqueando a main thread)
        img.decode().then(handleDone).catch(handleDone);
      };
      img.onerror = handleDone;
      img.src = frameUrl(i);
    };

    // Inicia lote inicial concorrente
    const initialWorkers = Math.min(CONCURRENCY, FRAME_COUNT);
    for (let w = 0; w < initialWorkers; w++) {
      loadNext();
    }
  });
}
