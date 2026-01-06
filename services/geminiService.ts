
import { GoogleGenAI, Type } from "@google/genai";

export async function generateKeyboardLandscape(prompt: string) {
  // Always use process.env.API_KEY directly as required
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the user request "${prompt}" into synth parameters. 
                 If it sounds like a real instrument (e.g. guitar, trumpet, piano), optimize for harmonic accuracy.
                 If it sounds abstract (e.g. wind in grass), optimize for spectral evolution and noise textures.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            waveform: { type: Type.STRING, description: 'sine, square, sawtooth, or triangle' },
            baseAttack: { type: Type.NUMBER, description: '0.01 to 2.0' },
            baseRelease: { type: Type.NUMBER, description: '0.1 to 3.0' },
            filterProgression: { type: Type.NUMBER, description: '0.1 to 1.5' },
            noiseLevel: { type: Type.NUMBER, description: '0 to 0.5' },
            resonance: { type: Type.NUMBER, description: '0 to 20' },
            detune: { type: Type.NUMBER, description: '0 to 50' },
            themeColor: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ['name', 'waveform', 'baseAttack', 'baseRelease', 'filterProgression', 'noiseLevel', 'resonance', 'detune', 'themeColor', 'description']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Received empty response from Gemini API");
    
    const data = JSON.parse(text);

    return { 
      id: Math.random().toString(36).substr(2, 9),
      author: 'AI Architect',
      ...data
    };
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}
