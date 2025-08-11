import { AIProvider, DummyAI } from "./ai.provider";

export async function getAI(): Promise<AIProvider> {
  const provider = (process.env.AI_PROVIDER || "dummy").toLowerCase();
  if (provider === "openai") {
    const { OpenAIProvider } = await import("./ai.openai");
    return new OpenAIProvider();
    // ileride: openrouter/azure vb. eklenebilir
  }
  return new DummyAI();
}