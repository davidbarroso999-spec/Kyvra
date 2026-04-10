import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing from the environment.");
      // We don't throw here to avoid crashing the whole app, 
      // but the subsequent calls will fail.
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiInstance;
}

export const MODELS = {
  TEXT: 'gemini-3-flash-preview',
  IMAGE: 'gemini-2.5-flash-image',
  PRO: 'gemini-3.1-pro-preview'
};

export async function generateText(prompt: string, systemInstruction?: string) {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: systemInstruction ? { systemInstruction } : undefined
    });

    if (response.text) {
      return response.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}
