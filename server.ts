import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared, lazy-initialized Gemini client on the server with telemetry headers
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Luxury Dark Poetic Whisper / Lore Quote Generator API
  app.post("/api/lore-quote", async (req, res) => {
    const { trackTitle, artist, vibe, theme } = req.body;
    const client = getGeminiClient();

    // High-fidelity fallback list matching Kyvra's dark themes
    const fallbackQuotes: Record<string, string[]> = {
      abissal: [
        "A quietude das profundezas consome todo o som que ousa nascer.",
        "No abismo de nós mesmos, cada nota é um farol que se apaga no breu.",
        "As correntes sussurram segredos de uma era onde a luz era apenas um mito.",
        "Sussurros do oceano morto moldam as fendas da nossa alma eterna."
      ],
      'sangue-de-drago': [
        "O fogo consome as cinzas do passado, desenhando runas de dor na escuridão.",
        "Nas veias da terra corre o sangue daqueles que ousaram desafiar o destino.",
        "Um eco de ferro e chamas ressoa sob o manto sagrado da noite eterna.",
        "Cinzas incandescentes flutuam sobre as lápides dos reinos esquecidos."
      ],
      'floresta-negra': [
        "As copas das árvores escondem mistérios que a luz do sol jamais ousou tocar.",
        "Cada sussurro do vento entre as folhas é uma elegia para as almas perdidas.",
        "O silêncio do bosque sagrado é o prelúdio de uma sinfonia que nunca termina.",
        "Sombras rastejam por raízes que bebem do pranto das estrelas caídas."
      ],
      monolito: [
        "A pedra ancestral ergue-se imutável diante da brevidade das eras mortais.",
        "Símbolos esquecidos vibram na rocha fustigada pelos ventos do esquecimento.",
        "A solidez do monumento guarda o peso de verdades que a humanidade desaprendeu.",
        "Uma torre de silêncio absoluto que desafia a erosão do tempo e das estrelas."
      ]
    };

    const activeTheme = theme || 'abissal';
    const themeQuotes = fallbackQuotes[activeTheme] || fallbackQuotes.abissal;

    if (!client) {
      // Return beautiful fallback if GEMINI_API_KEY is not defined
      const randomQuote = themeQuotes[Math.floor(Math.random() * themeQuotes.length)];
      return res.json({ quote: randomQuote });
    }

    try {
      const prompt = `Gere uma única linha poética, extremamente sombria, mística, melancólica e elegante (no estilo de metal sinfônico e literatura gótica) inspirada nas seguintes informações da música que está tocando no momento:
      - Título da música: "${trackTitle || 'Sinfonia do Vazio'}"
      - Artista: "${artist || 'Kyvra'}"
      - Atmosfera/Vibe: "${vibe || 'Introspectivo'}"
      - Tema visual do app: "${activeTheme}"

      Regras estritas de resposta:
      1. Retorne apenas e estritamente o poema/pensamento em português do Brasil (pt-br).
      2. Deve ter no máximo de 10 a 16 palavras. Uma frase curta e de enorme impacto estético e poético.
      3. Não use aspas na resposta. Não adicione introduções ou explicações. Apenas a frase poética pura.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Você é um poeta gótico e filósofo sombrio, co-autor das crônicas melancólicas do universo de Kyvra. Suas palavras são de luxo, místicas, misteriosas e profundas.",
          temperature: 0.95,
        }
      });

      const quote = response.text?.trim().replace(/^["']|["']$/g, '') || themeQuotes[0];
      res.json({ quote });
    } catch (err) {
      console.error("Kyvra Whisper API Error:", err);
      // Fallback on error
      const randomQuote = themeQuotes[Math.floor(Math.random() * themeQuotes.length)];
      res.json({ quote: randomQuote });
    }
  });

  // API Route for secure music share text generation via Gemini
  app.post("/api/share-text", async (req, res) => {
    const { track, albumArtist } = req.body;
    if (!track) {
      return res.status(400).json({ error: "Track data is required" });
    }

    const artist = track.artist || albumArtist || 'Artista Desconhecido';
    let cleanLyrics = '';
    if (track.lyrics) {
      cleanLyrics = track.lyrics.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
    }

    const client = getGeminiClient();
    const fallbackText = `Ouvindo ${track.title} de ${artist} no Kyvra. Fragmentos de um universo sombrio.`;

    if (!client) {
      return res.json({ text: fallbackText });
    }

    try {
      const prompt = `Crie um texto poético, curto e objetivo para acompanhar o compartilhamento da música "${track.title}" do artista "${artist}".
      O app é o "Kyvra". O tema geral é sombrio, misterioso e introspectivo (como um universo dark).
      Semente aleatória para variação: ${Math.random().toString(36).substring(7)}
      ${cleanLyrics ? `Baseie-se na letra:\n"${cleanLyrics}"\nAtue como um intérprete poético. Extraia a essência objetiva. Faça uma mini tradução poética sobre o significado, ex: "Este fragmento traz a dor através do silêncio, para lembrar que..."` : `Atue como um intérprete poético. Crie uma pequena frase objetiva revelando o significado profundo ou a emoção principal por trás do título dessa música, de forma misteriosa e direta.`}
      O texto DEVE terminar convidando a pessoa para descobrir no Kyvra, usando a hashtag #Kyvra. DEVE ser MUITO curto (máximo de 2 frases objetivas). Não seja genérico, seja único, criativo e reflexivo. Não use emojis. Retorne APENAS o texto final.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Você é um intérprete poético melancólico e misterioso do universo do Kyvra. Seus textos são refinados, góticos e breves.",
          temperature: 0.9,
        }
      });

      if (response.text) {
        const text = response.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        return res.json({ text });
      }
      throw new Error("Empty response from AI");
    } catch (err) {
      console.error("Share Text Generation Error:", err);
      return res.json({ text: fallbackText });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
