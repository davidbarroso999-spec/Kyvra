
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from "@google/genai";

const supabaseUrl = 'https://hntllxzoyfzsucpqcbdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhudGxseHpveWZ6c3VjcHFjYmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Mjg5NTQsImV4cCI6MjA5MTEwNDk1NH0.o7KBvotPrEp-PCimsS0JW0lIAOnIKMy-SI2RTe7s_sw';
const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiKey! });

async function generateVibesForAll() {
  try {
    console.log('--- INICIANDO CORREÇÃO DE VIBES ---');
    console.log('Usando chave:', geminiKey ? 'Detectada' : 'Não detectada');
    
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('*');

    if (error) throw error;
    if (!tracks || tracks.length === 0) {
      console.log('Nenhuma música encontrada.');
      return;
    }

    for (const track of tracks) {
      // Se a vibe parece uma duração (ex: "03:45" ou contém ":") ou está vazia, vamos regerar
      const isDuration = track.vibe && track.vibe.includes(':') && track.vibe.length < 10;
      
      if (!track.lyrics) {
        console.log(`Pulando "${track.title}" (sem letra).`);
        continue;
      }

      if (!isDuration && track.vibe && !track.vibe.includes('duration') && track.vibe.split('|').length >= 2) {
        console.log(`Vibe de "${track.title}" parece correta: ${track.vibe}`);
        continue;
      }

      console.log(`Analisando "${track.title}"...`);
      
      const prompt = `Você é o Arquivista de Kyvra. Analise a letra da música "${track.title}" e defina 3 'vibes' (sentimentos/climas) e 1 gênero musical que descrevam a obra.
        Use termos intensos, melancólicos e sombrios, mas com apelo estético e poético.
        Exemplos de vibes: Melancolia Profunda, Fúria Contida, Abismo Etéreo, Desespero Majestoso, Solidão Atroz, Êxtase Sombrio.
        Exemplos de gêneros: Dark Metal, Metal Sinfônico, Rock Gótico, Doom Metal, Metal Alternativo.
        
        Retorne APENAS um JSON no formato: {"vibes": ["vibe1", "vibe2", "vibe3"], "genre": "genero"}.
        Letra: ${track.lyrics}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      const text = response.text;
      const jsonMatch = text.match(/\{.*\}/s);
      if (!jsonMatch) {
        console.log(`Erro ao extrair JSON para "${track.title}"`);
        continue;
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      const vibeString = `${parsed.vibes.join(' | ')} | ${parsed.genre}`;

      const { error: updateError } = await supabase
        .from('tracks')
        .update({ vibe: vibeString })
        .eq('id', track.id);

      if (updateError) throw updateError;
      console.log(`✅ Vibes corrigidas para "${track.title}": ${vibeString}`);
    }

    console.log('\n--- CORREÇÃO CONCLUÍDA ---');

  } catch (err: any) {
    console.error('Erro:', err.message);
  }
}

generateVibesForAll();
