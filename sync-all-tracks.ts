
import { createClient } from '@supabase/supabase-js';
import * as mm from 'music-metadata';

const supabaseUrl = 'https://hntllxzoyfzsucpqcbdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudGxseHpveWZ6c3VjcHFjYmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Mjg5NTQsImV4cCI6MjA5MTEwNDk1NH0.o7KBvotPrEp-PCimsS0JW0lIAOnIKMy-SI2RTe7s_sw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAll() {
  try {
    console.log('--- INICIANDO RECONSTRUÇÃO DO ACERVO VIA METADADOS ---');
    
    // 1. Buscar todas as músicas
    const { data: tracks, error: tracksError } = await supabase
      .from('tracks')
      .select('*, albums(*)');

    if (tracksError) throw tracksError;
    if (!tracks || tracks.length === 0) {
      console.log('Nenhuma música encontrada para sincronizar.');
      return;
    }

    console.log(`Encontradas ${tracks.length} músicas. Processando...`);

    for (const track of tracks) {
      console.log(`\nSincronizando: "${track.title}"...`);
      try {
        const response = await fetch(track.audio_url);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        
        const buffer = await response.arrayBuffer();
        const metadata = await mm.parseBuffer(Buffer.from(buffer), { mimeType: 'audio/mpeg' });
        
        const common = metadata.common;
        const format = metadata.format;

        // Preparar atualizações da música
        const trackUpdates: any = {
          title: common.title || track.title,
          artist: common.artist || track.artist || 'Kyvra',
          track_number: common.track.no || track.track_number,
          lyrics: common.lyrics ? common.lyrics.map(l => typeof l === 'string' ? l : l.text).join('\n') : track.lyrics,
        };

        // Formatar duração
        if (format.duration) {
          const minutes = Math.floor(format.duration / 60);
          const seconds = Math.floor(format.duration % 60);
          trackUpdates.duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Atualizar no Supabase
        const { error: updateError } = await supabase
          .from('tracks')
          .update(trackUpdates)
          .eq('id', track.id);

        if (updateError) throw updateError;
        console.log(`✅ Música "${trackUpdates.title}" atualizada.`);

        // Se houver metadados de álbum, atualizar o álbum vinculado
        if (track.album_id && (common.album || common.year)) {
          const albumUpdates: any = {};
          if (common.album) albumUpdates.title = common.album;
          if (common.year) albumUpdates.release_year = common.year.toString();

          const { error: albumUpdateError } = await supabase
            .from('albums')
            .update(albumUpdates)
            .eq('id', track.album_id);
          
          if (!albumUpdateError) {
            console.log(`✅ Álbum "${common.album || 'ID:' + track.album_id}" atualizado.`);
          }
        }

      } catch (err: any) {
        console.error(`❌ Erro na faixa "${track.title}":`, err.message);
      }
    }

    console.log('\n--- SINCRONIZAÇÃO CONCLUÍDA ---');
    console.log('Todos os arquivos existentes foram lidos e o banco de dados foi atualizado com os novos metadados.');

  } catch (err: any) {
    console.error('Erro geral na sincronização:', err.message);
  }
}

syncAll();
