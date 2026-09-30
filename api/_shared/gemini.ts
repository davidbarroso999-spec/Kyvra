import { GoogleGenAI } from '@google/genai';

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  if (!client) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'Kyvra-App' },
      },
    });
  }
  return client;
}
