import { GoogleGenAI } from "@google/genai";
import { AgentRole } from "../types";
import { PROMPTS } from "../constants";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-flash-preview'; 

export const generateAgentResponse = async (
  role: AgentRole,
  context: string,
  useSearch: boolean = false
): Promise<string> => {
  try {
    const systemInstruction = PROMPTS[role];
    
    // Construct the prompt history
    const fullContext = `
      Current Task/Input:
      ${context}
    `;

    const config: any = {
      systemInstruction: systemInstruction,
      temperature: role === AgentRole.CRITIC ? 0.0 : 0.7,
    };

    if (useSearch) {
        config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: fullContext,
      config: config
    });

    let finalText = response.text || "I apologize, I could not generate a response.";

    // Append Grounding Sources if available
    if (useSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        const sources = chunks
            .map((chunk: any) => chunk.web?.uri ? `- [${chunk.web.title || 'Source'}](${chunk.web.uri})` : null)
            .filter(Boolean);
        
        if (sources.length > 0) {
            finalText += `\n\n**参考来源 (Sources):**\n${sources.join('\n')}`;
        }
    }

    return finalText;
  } catch (error) {
    console.error(`Error generating response for ${role}:`, error);
    return `[System Error]: Failed to contact ${role} agent. check API Key or Internet connection.`;
  }
};