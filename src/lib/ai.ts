/**
 * Cliente de IA do Kyvra.
 *
 * A GEMINI_API_KEY nunca é embutida no bundle: todas as gerações passam pelo
 * servidor Express (`/api/ai/text` e `/api/ai/image`), que mantém a chave
 * exclusivamente server-side via process.env.GEMINI_API_KEY.
 */

let serverConfigured: boolean | null = null;

async function isServerConfigured(): Promise<boolean> {
  if (serverConfigured !== null) return serverConfigured;
  try {
    const response = await fetch('/api/github/status');
    // A existência da rota indica que estamos no servidor integrado; a chave
    // da IA é verificada por cada endpoint individualmente.
    serverConfigured = response.ok || response.status === 503;
  } catch {
    serverConfigured = false;
  }
  return serverConfigured;
}

export const MODELS = {
  TEXT: 'gemini-3-flash-preview',
  IMAGE: 'gemini-2.5-flash-image',
  PRO: 'gemini-3.1-pro-preview',
};

export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  const response = await fetch('/api/ai/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemInstruction }),
  });

  if (!response.ok) {
    let message = 'Falha na geração de texto.';
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      // resposta sem JSON: mantém mensagem padrão
    }
    if (response.status === 503) {
      message = 'IA não configurada: adicione GEMINI_API_KEY no servidor.';
    }
    throw new Error(message);
  }

  const payload = await response.json();
  const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
  if (!text) throw new Error('Empty response from AI');
  return text.replace(/\*\*/g, '').replace(/\*/g, '');
}

export async function generateMultimodal(
  prompt: string,
  parts: any[],
  systemInstruction?: string
): Promise<string> {
  // Mantido para compatibilidade: concatena o conteúdo textual das partes no prompt.
  const extras = Array.isArray(parts)
    ? parts
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .filter(Boolean)
        .join('\n')
    : '';
  return generateText(`${prompt}${extras ? `\n\n${extras}` : ''}`, systemInstruction);
}

export async function generateImage(prompt: string): Promise<string> {
  const response = await fetch('/api/ai/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    let message = 'Falha na geração de imagem.';
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      // resposta sem JSON: mantém mensagem padrão
    }
    if (response.status === 503) {
      message = 'IA não configurada: adicione GEMINI_API_KEY no servidor.';
    }
    throw new Error(message);
  }

  const payload = await response.json();
  if (typeof payload?.imageBase64 === 'string' && payload.imageBase64) {
    return `data:${payload.mimeType || 'image/png'};base64,${payload.imageBase64}`;
  }
  throw new Error('No image returned by AI');
}

export async function isAIConfigured(): Promise<boolean> {
  return isServerConfigured();
}
