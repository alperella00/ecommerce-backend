import type { AIMessage, AIProvider } from "./ai.provider";

export class OpenAIProvider implements AIProvider {
  private apiKey = process.env.AI_API_KEY!;
  private model = process.env.AI_MODEL || "gpt-4o-mini";

  async chat(messages: AIMessage[]): Promise<string> {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages
      })
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`OpenAI error: ${resp.status} ${t}`);
    }
    const json = await resp.json();
    return json.choices?.[0]?.message?.content || "";
  }
}