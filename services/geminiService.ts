
import { GoogleGenAI, Type } from "@google/genai";
import { RoadmapNode } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const brainstormIdea = async (prompt: string, history: {role: string, content: string}[]) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "You are a world-class startup incubator consultant and creative strategist. Your goal is to take a user's raw idea and help them flesh it out. Be encouraging but critical, suggesting unique angles, potential pitfalls, and monetization strategies.",
    },
  });

  const response = await chat.sendMessage({ message: prompt });
  return response.text;
};

export const generateRoadmap = async (ideaSummary: string): Promise<RoadmapNode> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this idea: "${ideaSummary}", create a structured 4-level deep roadmap for building it. Include key features, technical requirements, and milestones.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          children: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                children: {
                  type: Type.ARRAY,
                  items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } }
                }
              }
            }
          }
        },
        required: ["name", "children"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse roadmap JSON", e);
    throw new Error("Invalid roadmap structure received from AI");
  }
};

export const generatePrototypeImage = async (prompt: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: `A clean, professional UI/UX design mockup or concept art for: ${prompt}. High quality, 4k, minimalist aesthetic, modern technology product concept.` }
      ]
    },
    config: {
      imageConfig: { aspectRatio: "16:9" }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const generatePitch = async (idea: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Write a compelling elevator pitch and a 3-slide pitch deck outline for this idea: ${idea}. Make it sound professional and investment-ready.`,
  });
  return response.text;
};
