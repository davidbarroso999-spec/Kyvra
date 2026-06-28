import { useMemo, useEffect, useRef } from 'react';

export interface LrcLine {
  timestamp: number;      // segundos (ex: 12.50)
  text: string;           // texto da linha
  startMs: number;        // milissegundos (ex: 12500)
}

interface LrcLibCacheEntry {
  syncedLyrics: string | null;
  timestamp: number;
}

/**
 * Faz o parsing de letras no formato LRC para uma lista de linhas cronometradas.
 */
export function parseLRC(lrcText: string): LrcLine[] {
  if (!lrcText) return [];
  
  const lines = lrcText.split('\n');
  const result: LrcLine[] = [];
  
  // Regex flexível: captura marcadores como [01:23.45] ou [01:23:45] ou [01:23.450]
  const lrcRegex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]\s*(.*)/;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const match = trimmed.match(lrcRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centisStr = match[3];
      const text = match[4].trim();
      
      // Converte centissegundos / milissegundos corretamente baseado no comprimento do dígito
      let milliseconds = 0;
      if (centisStr.length === 2) {
        milliseconds = parseInt(centisStr, 10) * 10;
      } else if (centisStr.length === 3) {
        milliseconds = parseInt(centisStr, 10);
      }
      
      const startMs = (minutes * 60 + seconds) * 1000 + milliseconds;
      const timestamp = startMs / 1000;
      
      result.push({
        timestamp,
        text,
        startMs
      });
    }
  }
  
  return result.sort((a, b) => a.startMs - b.startMs);
}

/**
 * Hook para calcular em tempo real qual linha está tocando de acordo com o progresso do áudio.
 */
export function useLyricSync(currentTimeMs: number, lrcLines: LrcLine[]) {
  return useMemo(() => {
    if (!lrcLines || lrcLines.length === 0) {
      return {
        currentLineIndex: -1,
        nextLineIndex: -1,
        lrcLines: [],
        currentLine: null
      };
    }

    let currentLineIndex = -1;

    for (let i = 0; i < lrcLines.length; i++) {
      if (currentTimeMs >= lrcLines[i].startMs) {
        currentLineIndex = i;
      } else {
        break;
      }
    }

    const nextLineIndex = currentLineIndex + 1 < lrcLines.length ? currentLineIndex + 1 : -1;
    const currentLine = currentLineIndex >= 0 ? lrcLines[currentLineIndex] : null;

    return {
      currentLineIndex,
      nextLineIndex,
      lrcLines,
      currentLine
    };
  }, [currentTimeMs, lrcLines]);
}

/**
 * Remove termos extras comuns como "Remaster", "Live", etc., para melhorar a taxa de acerto na API de letras.
 */
function cleanTrackQuery(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s*[\(\[][^)]*[\)\]]/g, '') // Remove (Remaster), [Original Mix], [Live], (feat. x) etc.
    .replace(/\s+-\s+.*/g, '')            // Remove tudo após o hífen principal
    .replace(/\s*feat\..*/gi, '')         // Remove feat. artista
    .trim();
}

/**
 * Busca letras sincronizadas na API LrcLib com fallback silencioso e cache no localStorage de 7 dias.
 */
export async function fetchLyricsFromLrcLib(
  artist: string,
  title: string,
  album?: string
): Promise<string | null> {
  if (!artist || !title) return null;

  // Higieniza termos de busca para maximizar chances de sucesso no LrcLib
  const cleanArtist = cleanTrackQuery(artist);
  const cleanTitle = cleanTrackQuery(title);

  const cacheKey = `lrclib_${cleanArtist.toLowerCase().trim()}_${cleanTitle.toLowerCase().trim()}`;
  
  // 1. Tenta recuperar do cache local do navegador
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed: LrcLibCacheEntry = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000; // 7 dias
      if (!isExpired) {
        return parsed.syncedLyrics;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler cache do LrcLib:', e);
  }

  // 2. Faz a chamada HTTP externa de modo seguro
  try {
    const url = new URL('https://lrclib.net/api/get');
    url.searchParams.append('artist', cleanArtist);
    url.searchParams.append('title', cleanTitle);
    if (album) {
      url.searchParams.append('album', album);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      // Salva valor nulo para evitar múltiplas requisições sequenciais desnecessárias
      const cacheData: LrcLibCacheEntry = { syncedLyrics: null, timestamp: Date.now() };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return null;
    }

    const data = await response.json();
    const syncedLyrics = data.syncedLyrics || null;

    // Cacheia o resultado
    const cacheData: LrcLibCacheEntry = { syncedLyrics, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));

    return syncedLyrics;
  } catch (error) {
    console.warn('Kyvra [LrcLib API]: Falha ao buscar letras externas:', error);
    return null;
  }
}

/**
 * Faz o parsing de letras no formato LRC. Se o formato não for LRC (sem carimbos de tempo),
 * gera carimbos de tempo proporcionais e simulados ao longo da duração da música,
 * para que a rolagem e sincronização continuem funcionando de forma espetacular e pareçam dinâmicas!
 */
export function parseLRCWithFallback(lrcText: string, durationSeconds?: number): LrcLine[] {
  if (!lrcText) return [];
  
  // Tenta parsear como LRC real primeiro
  const realLrc = parseLRC(lrcText);
  if (realLrc.length > 0) {
    return realLrc;
  }
  
  // Se não houver marcações LRC reais e tivermos duração, vamos fazer a interpolação proporcional premium!
  const lines = lrcText
    .split('\n')
    .map(line => line.trim())
    // Remove cabeçalhos de LRC comuns como [by:xxx], [ar:xxx], [ti:xxx], etc.
    .filter(line => line && !line.startsWith('[ar:') && !line.startsWith('[ti:') && !line.startsWith('[al:') && !line.startsWith('[by:') && !line.startsWith('[length:'));
    
  if (lines.length === 0) return [];
  
  const totalDuration = durationSeconds && durationSeconds > 0 ? durationSeconds : 180; // Fallback para 3 minutos se não houver duração
  
  // Distribui as linhas ao longo de 90% da duração da música para que o final tenha um espaço de silêncio natural
  const activeDuration = totalDuration * 0.9;
  const timePerLine = activeDuration / lines.length;
  
  return lines.map((text, idx) => {
    // Caso a linha comece com metadados ou colchetes perdidos, limpa
    const cleanText = text.replace(/^\[\d+\]\s*/, '').trim();
    const startMs = Math.round(idx * timePerLine * 1000);
    const timestamp = startMs / 1000;
    
    return {
      timestamp,
      text: cleanText,
      startMs
    };
  });
}

/**
 * Utilitário para centralizar verticalmente o scroll do container de letras no elemento ativo.
 */
export function scrollToLine(
  containerRef: React.RefObject<HTMLDivElement | null>,
  lineEl: HTMLElement | null
) {
  if (!containerRef.current || !lineEl) return;

  // Ajusta a rolagem para centralizar a linha ativa dentro do container com animação suave
  const container = containerRef.current;
  const containerHeight = container.clientHeight;
  const lineOffsetTop = lineEl.offsetTop;
  const lineGap = lineEl.clientHeight / 2;
  
  container.scrollTo({
    top: lineOffsetTop - containerHeight / 2 + lineGap,
    behavior: 'smooth'
  });
}
