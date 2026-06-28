import { generateText } from '@/lib/ai';

export async function generateTrackShareText(track: any, albumArtist?: string): Promise<string> {
  const artist = track.artist || albumArtist || 'Artista Desconhecido';
  let cleanLyrics = '';
  
  if (track.lyrics) {
    cleanLyrics = track.lyrics.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
  }

  try {
    const prompt = `Crie um texto poético, curto e objetivo para acompanhar o compartilhamento da música "${track.title}" do artista "${artist}".
    O app é o "Kyvra". O tema geral é sombrio, misterioso e introspectivo (como um universo dark).
    Semente aleatória para variação: ${Math.random().toString(36).substring(7)}
    ${cleanLyrics ? `Baseie-se na letra:\n"${cleanLyrics}"\nAtue como um intérprete poético. Extraia a essência objetiva. Faça uma mini tradução poética sobre o significado, ex: "Este fragmento traz a dor através do silêncio, para lembrar que..."` : `Atue como um intérprete poético. Crie uma pequena frase objetiva revelando o significado profundo ou a emoção principal por trás do título dessa música, de forma misteriosa e direta.`}
    O texto DEVE terminar convidando a pessoa para descobrir no Kyvra, usando a hashtag #Kyvra. DEVE ser MUITO curto (máximo de 2 frases objetivas). Não seja genérico, seja único, criativo e reflexivo. Não use emojis. Retorne APENAS o texto final.`;

    const generated = await generateText(prompt);
    if (generated) {
      return generated;
    }
  } catch (err) {
    console.error("Error generating share text:", err);
  }

  // Fallback se a IA falhar
  return `Ouvindo ${track.title} de ${artist} no Kyvra. Fragmentos de um universo sombrio.`;
}
