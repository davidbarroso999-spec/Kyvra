
import { createClient } from '@supabase/supabase-js';
import * as mm from 'music-metadata';

const supabaseUrl = 'https://hntllxzoyfzsucpqcbdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudGxseHpveWZ6c3VjcHFjYmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Mjg5NTQsImV4cCI6MjA5MTEwNDk1NH0.o7KBvotPrEp-PCimsS0JW0lIAOnIKMy-SI2RTe7s_sw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTags() {
  try {
    console.log('Buscando uma música no banco de dados...');
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('title, audio_url')
      .limit(5);

    if (error) throw error;
    if (!tracks || tracks.length === 0) {
      console.log('Nenhuma música encontrada.');
      return;
    }

    for (const track of tracks) {
      console.log(`\n--- Lendo: "${track.title}" ---`);
      try {
        const response = await fetch(track.audio_url);
        const buffer = await response.arrayBuffer();
        const metadata = await mm.parseBuffer(Buffer.from(buffer), { mimeType: 'audio/mpeg' });
        
        console.log('Título:', metadata.common.title);
        console.log('Artista:', metadata.common.artist);
        console.log('Álbum:', metadata.common.album);
        console.log('Track No:', metadata.common.track.no);
        console.log('Letras:', metadata.common.lyrics ? 'ENCONTRADAS' : 'Não encontradas');
        
        if (metadata.common.lyrics) {
          const lyricsText = metadata.common.lyrics.map(l => typeof l === 'string' ? l : l.text).join('\n');
          console.log('Letra (primeiros 200 caracteres):', lyricsText.substring(0, 200) + '...');
          break; // Found one with lyrics, stop here
        }
      } catch (e) {
        console.log(`Erro na faixa ${track.title}:`, e.message);
      }
    }

  } catch (err) {
    console.error('Erro ao ler tags:', err);
  }
}

debugTags();
