/**
 * Kyvra - Worker de produção (Freebuff Sites / Cloudflare Workers).
 *
 * Serve o build estático (dist/) e mantém as rotas de API que antes viviam no
 * servidor Express (server.ts) e no rewrite da Vercel (vercel.json):
 *   - /api/github/*   -> GitHub REST (token exclusivamente server-side)
 *   - /api/lore-quote -> sussurro poético (Gemini + fallback local)
 *   - /api/share-text -> texto de compartilhamento (Gemini + fallback local)
 *   - /api/ai/text    -> geração de texto (Gemini)
 *   - /api/ai/image   -> geração de imagem (Gemini)
 *   - /cdn/frames/*   -> proxy para o repositório de frames no GitHub
 */

const FRAMES_BASE = 'https://raw.githubusercontent.com/davidbarroso999-spec/Aleatoriedades/main';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const FALLBACK_QUOTES = {
  abissal: [
    'A quietude das profundezas consome todo o som que ousa nascer.',
    'No abismo de nós mesmos, cada nota é um farol que se apaga no breu.',
    'As correntes sussurram segredos de uma era onde a luz era apenas um mito.',
    'Sussurros do oceano morto moldam as fendas da nossa alma eterna.',
  ],
  'sangue-de-drago': [
    'O fogo consome as cinzas do passado, desenhando runas de dor na escuridão.',
    'Nas veias da terra corre o sangue daqueles que ousaram desafiar o destino.',
    'Um eco de ferro e chamas ressoa sob o manto sagrado da noite eterna.',
    'Cinzas incandescentes flutuam sobre as lápides dos reinos esquecidos.',
  ],
  'floresta-negra': [
    'As copas das árvores escondem mistérios que a luz do sol jamais ousou tocar.',
    'Cada sussurro do vento entre as folhas é uma elegia para as almas perdidas.',
    'O silêncio do bosque sagrado é o prelúdio de uma sinfonia que nunca termina.',
    'Sombras rastejam por raízes que bebem do pranto das estrelas caídas.',
  ],
  monolito: [
    'A pedra ancestral ergue-se imutável diante da brevidade das eras mortais.',
    'Símbolos esquecidos vibram na rocha fustigada pelos ventos do esquecimento.',
    'A solidez do monumento guarda o peso de verdades que a humanidade desaprendeu.',
    'Uma torre de silêncio absoluto que desafia a erosão do tempo e das estrelas.',
  ],
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function pickQuote(themeQuotes) {
  return themeQuotes[Math.floor(Math.random() * themeQuotes.length)];
}

async function generateContent(env, model, payload) {
  const response = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
      'user-agent': 'aistudio-build',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned ${response.status}`);
  }

  return response.json();
}

function textFromResponse(response) {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

async function githubRequest(env, endpoint) {
  if (!env.GITHUB_TOKEN) {
    const error = new Error('GITHUB_TOKEN is not configured');
    error.status = 503;
    throw error;
  }

  const response = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'Kyvra-App',
    },
  });

  if (!response.ok) {
    const error = new Error(`GitHub API returned ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function handleGithubStatus(env) {
  if (!env.GITHUB_TOKEN) {
    return json({ configured: false });
  }

  try {
    const user = await githubRequest(env, '/user');
    return json({
      configured: true,
      user: {
        login: user.login,
        name: user.name,
        avatarUrl: user.avatar_url,
        profileUrl: user.html_url,
        publicRepositories: user.public_repos,
      },
    });
  } catch (error) {
    console.error('GitHub status check failed:', error);
    return json(
      {
        configured: true,
        error: error.status === 401 ? 'GITHUB_TOKEN is invalid or expired' : 'GitHub is unavailable',
      },
      error.status === 401 ? 401 : 502,
    );
  }
}

async function handleGithubRepositories(env, url) {
  const requestedLimit = Number(url.searchParams.get('limit')) || 30;
  const limit = Math.min(Math.max(requestedLimit, 1), 100);

  try {
    const repositories = await githubRequest(
      env,
      `/user/repos?visibility=all&sort=updated&direction=desc&per_page=${limit}`,
    );

    return json({
      repositories: repositories.map((repository) => ({
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        isPrivate: repository.private,
        url: repository.html_url,
        description: repository.description,
        defaultBranch: repository.default_branch,
        updatedAt: repository.updated_at,
      })),
    });
  } catch (error) {
    console.error('GitHub repositories request failed:', error);
    const status = error.status;
    return json(
      {
        error:
          status === 401
            ? 'GITHUB_TOKEN is invalid or expired'
            : status === 403
              ? 'GITHUB_TOKEN does not have permission to list repositories'
              : 'GitHub is unavailable',
      },
      status === 401 ? 401 : status === 403 ? 403 : 502,
    );
  }
}

async function handleLoreQuote(request, env) {
  const { trackTitle, artist, vibe, theme } = await readJson(request);
  const activeTheme = theme || 'abissal';
  const themeQuotes = FALLBACK_QUOTES[activeTheme] || FALLBACK_QUOTES.abissal;

  if (!env.GEMINI_API_KEY) {
    return json({ quote: pickQuote(themeQuotes) });
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

    const response = await generateContent(env, 'gemini-3.5-flash', {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [
          {
            text: 'Você é um poeta gótico e filósofo sombrio, co-autor das crônicas melancólicas do universo de Kyvra. Suas palavras são de luxo, místicas, misteriosas e profundas.',
          },
        ],
      },
      generationConfig: { temperature: 0.95 },
    });

    const quote = textFromResponse(response).replace(/^["']|["']$/g, '') || themeQuotes[0];
    return json({ quote });
  } catch (error) {
    console.error('Kyvra Whisper API Error:', error);
    return json({ quote: pickQuote(themeQuotes) });
  }
}

async function handleShareText(request, env) {
  const { track, albumArtist } = await readJson(request);
  if (!track) {
    return json({ error: 'Track data is required' }, 400);
  }

  const artist = track.artist || albumArtist || 'Artista Desconhecido';
  let cleanLyrics = '';
  if (track.lyrics) {
    cleanLyrics = String(track.lyrics).replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
  }

  const fallbackText = `Ouvindo ${track.title} de ${artist} no Kyvra. Fragmentos de um universo sombrio.`;

  if (!env.GEMINI_API_KEY) {
    return json({ text: fallbackText });
  }

  try {
    const prompt = `Crie um texto poético, curto e objetivo para acompanhar o compartilhamento da música "${track.title}" do artista "${artist}".
      O app é o "Kyvra". O tema geral é sombrio, misterioso e introspectivo (como um universo dark).
      Semente aleatória para variação: ${Math.random().toString(36).substring(7)}
      ${
        cleanLyrics
          ? `Baseie-se na letra:\n"${cleanLyrics}"\nAtue como um intérprete poético. Extraia a essência objetiva. Faça uma mini tradução poética sobre o significado, ex: "Este fragmento traz a dor através do silêncio, para lembrar que..."`
          : 'Atue como um intérprete poético. Crie uma pequena frase objetiva revelando o significado profundo ou a emoção principal por trás do título dessa música, de forma misteriosa e direta.'
      }
      O texto DEVE terminar convidando a pessoa para descobrir no Kyvra, usando a hashtag #Kyvra. DEVE ser MUITO curto (máximo de 2 frases objetivas). Não seja genérico, seja único, criativo e reflexivo. Não use emojis. Retorne APENAS o texto final.`;

    const response = await generateContent(env, 'gemini-3.5-flash', {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [
          {
            text: 'Você é um intérprete poético melancólico e misterioso do universo do Kyvra. Seus textos são refinados, góticos e breves.',
          },
        ],
      },
      generationConfig: { temperature: 0.9 },
    });

    const text = textFromResponse(response);
    if (text) {
      return json({ text: text.replace(/\*\*/g, '').replace(/\*/g, '').trim() });
    }
    throw new Error('Empty response from AI');
  } catch (error) {
    console.error('Share Text Generation Error:', error);
    return json({ text: fallbackText });
  }
}

async function handleAiText(request, env) {
  const { prompt, systemInstruction } = await readJson(request);
  if (!prompt || typeof prompt !== 'string') {
    return json({ error: 'prompt is required' }, 400);
  }

  if (!env.GEMINI_API_KEY) {
    return json({ error: 'GEMINI_API_KEY is not configured' }, 503);
  }

  try {
    const payload = { contents: [{ parts: [{ text: prompt }] }] };
    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await generateContent(env, 'gemini-3-flash-preview', payload);
    const text = textFromResponse(response);
    if (text) {
      return json({ text });
    }
    return json({ error: 'Empty response from AI' }, 502);
  } catch (error) {
    console.error('AI text generation error:', error);
    return json({ error: 'AI generation failed' }, 502);
  }
}

async function handleAiImage(request, env) {
  const { prompt } = await readJson(request);
  if (!prompt || typeof prompt !== 'string') {
    return json({ error: 'prompt is required' }, 400);
  }

  if (!env.GEMINI_API_KEY) {
    return json({ error: 'GEMINI_API_KEY is not configured' }, 503);
  }

  try {
    const response = await generateContent(env, 'gemini-2.5-flash-image', {
      contents: [{ parts: [{ text: prompt }] }],
    });

    const parts = response?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        if (part?.inlineData?.data) {
          return json({
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          });
        }
      }
    }
    return json({ error: 'No image returned by AI' }, 502);
  } catch (error) {
    console.error('AI image generation error:', error);
    return json({ error: 'AI image generation failed' }, 502);
  }
}

async function handleApi(request, url, env) {
  const path = url.pathname;

  if (path === '/api/github/status' && request.method === 'GET') {
    return handleGithubStatus(env);
  }
  if (path === '/api/github/repositories' && request.method === 'GET') {
    return handleGithubRepositories(env, url);
  }
  if (path === '/api/lore-quote' && request.method === 'POST') {
    return handleLoreQuote(request, env);
  }
  if (path === '/api/share-text' && request.method === 'POST') {
    return handleShareText(request, env);
  }
  if (path === '/api/ai/text' && request.method === 'POST') {
    return handleAiText(request, env);
  }
  if (path === '/api/ai/image' && request.method === 'POST') {
    return handleAiImage(request, env);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleFrames(url) {
  const target = `${FRAMES_BASE}${url.pathname.replace(/^\/cdn\/frames/, '')}${url.search}`;
  const upstream = await fetch(target, {
    headers: { 'user-agent': 'Kyvra-App' },
    cf: { cacheEverything: true, cacheTtl: 31536000 },
  });

  if (!upstream.ok) {
    return new Response(`Upstream returned ${upstream.status}`, { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
      'access-control-allow-origin': '*',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, url, env);
      } catch (error) {
        console.error('Unhandled API error:', error);
        return json({ error: 'Internal error' }, 500);
      }
    }

    if (url.pathname.startsWith('/cdn/frames/')) {
      return handleFrames(url);
    }

    return env.ASSETS.fetch(request);
  },
};
