import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_AI_API_KEY;
const modelName = process.env.EMBEDDING_MODEL || "gemini-embedding-001";

if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");

export const EMBED_DIMS = 768;

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: modelName });

export async function embed(text: string): Promise<number[]> {
  const { embedding } = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    outputDimensionality: EMBED_DIMS,
  } as Parameters<typeof model.embedContent>[0]);
  return embedding.values;
}
