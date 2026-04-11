
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from "@google/genai";

const supabaseUrl = 'https://hntllxzoyfzsucpqcbdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudGxseHpveWZ6c3VjcHFjYmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Mjg5NTQsImV4cCI6MjA5MTEwNDk1NH0.o7KBvotPrEp-PCimsS0JW0lIAOnIKMy-SI2RTe7s_sw';
const geminiKey = process.env.GEMINI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenAI({ apiKey: geminiKey! });

async function generateVibesForAll() {
  try {
    console.log('--- INICIANDO GERAÇÃO DE VIBES VIA IA ---');
    
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('*');

    if (error) throw error;
    if (!tracks || tracks.length === 0) {
      console.log('Nenhuma música encontrada.');
      return;
    }

    for (const track of tracks) {
      if (!track.lyrics) {
        console.log(`Pulando "${track.title}" (sem letra).`);
        continue;
      }

      console.log(`Analisando "${track.title}"...`);
      
      const prompt = `Você é o Arquivista de Kyvra. Analise a letra da música "${track.title}" e defina 3 'vibes' (sentimentos/climas) e 1 gênero musical que descrevam a obra.
        Use termos intensos, melancólicos e sombrios, mas com apelo estético e poético.
        Exemplos de vibes: Melancolia Profunda, Fúria Contida, Abismo Etéreo, Desespero Majestoso, Solidão Atroz, Êxtase Sombrio.
        Exemplos de gêneros: Dark Metal, Metal Sinfônico, Rock Gótico, Doom Metal, Metal Alternativo.
        
        Retorne APENAS um JSON no formato: {"vibes": ["vibe1", "vibe2", "vibe3"], "genre": "genero"}.
        Letra: ${track.lyrics}`;

      const response = await (genAI as any).models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt
      });

      const text = response.text;
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const vibeString = parsed.vibes.join(' | ');
      const genre = parsed.genre;

      const { error: updateError } = await supabase
        .from('tracks')
        .update({ vibe: vibeString, genre: genre })
        .eq('id', track.id);

      if (updateError) throw updateError;
      console.log(`✅ Vibes geradas para "${track.title}": ${vibeString} (${genre})`);
    }

    console.log('\n--- GERAÇÃO CONCLUÍDA ---');

  } catch (err: any) {
    console.error('Erro:', err.message);
  }
}

generateVibesForAll();
