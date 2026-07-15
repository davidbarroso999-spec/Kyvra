export async function generateTrackShareText(track: any, albumArtist?: string): Promise<string> {
  const artist = track.artist || albumArtist || 'Artista Desconhecido';
  const title = track.title || 'Fragmento';
  
  // Limpar a letra de tags de tempo para extrair um verso real se disponível
  let cleanLyricsLines: string[] = [];
  if (track.lyrics) {
    cleanLyricsLines = track.lyrics
      .split('\n')
      .map((line: string) => {
        // Remove timestamps tipo [00:12.34] ou [01:23]
        let cleaned = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
        // Remove marcas de seção como [Refrão], [Guitar Solo] etc.
        cleaned = cleaned.replace(/\[.*?\]/g, '').trim();
        return cleaned;
      })
      .filter((line: string) => line.length > 3 && !line.includes('[') && !line.includes(']'));
  }

  let quote = '';

  // Se a música possuir letras com versos reais, escolhemos um e formatamos com reticências e emoji de nota musical
  if (cleanLyricsLines.length > 0) {
    const lyricSeed = (title.length + artist.length) % cleanLyricsLines.length;
    const lyricVerse = cleanLyricsLines[lyricSeed];
    quote = `"${lyricVerse}... 🎵" — Um verso solene extraído da profunda elegia de "${title}".`;
  } else {
    // Caso a música não possua letra cadastrada, usamos fragmentos poéticos inspirados no universo gótico do Kyvra
    const defaultLyrics = [
      `Ecoam vozes sob a abóbada de pedra gélida... 🎵`,
      `Onde o silêncio abraça o fim das eras... 🎵`,
      `Sussurros do abismo guiam nossos passos vagantes... 🎵`,
      `Nas cinzas do tempo, apenas a elegia restou... 🎵`,
      `Sombras dançam sob a luz fria das estrelas mortas... 🎵`,
      `O sopro do vento traz segredos esquecidos... 🎵`,
      `Onde as almas encontram o repouso soturno... 🎵`,
      `Entre coros de pura melancolia e grandiosidade... 🎵`
    ];
    const fallbackSeed = (title.length + artist.length) % defaultLyrics.length;
    const fallbackVerse = defaultLyrics[fallbackSeed];
    quote = `"${fallbackVerse}" — Um eco misterioso sob a melodia de "${title}".`;
  }

  // Define o cabeçalho de reprodução evitando repetir "de Kyvra no Kyvra"
  const isKyvraArtist = artist.toLowerCase() === 'kyvra';
  const heading = isKyvraArtist 
    ? `Ouvindo "${title}" no Kyvra.` 
    : `Ouvindo "${title}" de ${artist} no Kyvra.`;

  return `${heading}\n\n${quote}\n\nUna-se ao abismo. #Kyvra`;
}
