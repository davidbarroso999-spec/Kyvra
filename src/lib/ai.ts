import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getAI() {
  if (!aiInstance) {
    // Try process.env first as per skill instructions
    let apiKey = '';
    
    try {
      apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
    } catch (e) {
      // process might not be defined in browser
    }
    
    // Fallback to import.meta.env if process.env is not available or empty
    if (!apiKey && typeof (import.meta as any).env !== 'undefined') {
      apiKey = (import.meta as any).env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
    }

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing from all environment sources.");
    } else {
      console.log("GEMINI_API_KEY detected and AI instance initialized.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const MODELS = {
  TEXT: 'gemini-1.5-flash',
  IMAGE: 'gemini-2.0-flash-preview-image-generation',
  PRO: 'gemini-1.5-pro'
};

export async function generateText(prompt: string, systemInstruction?: string) {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
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

export async function generateMultimodal(prompt: string, parts: any[], systemInstruction?: string) {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: { parts: [{ text: prompt }, ...parts] },
      config: systemInstruction ? { systemInstruction } : undefined
    });

    if (response.text) {
      return response.text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("AI Multimodal Error:", error);
    throw error;
  }
}
