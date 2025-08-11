export interface AIMessage { role: "system" | "user" | "assistant"; content: string; }
export interface AIProvider {
  chat(messages: AIMessage[]): Promise<string>;
}

export class DummyAI implements AIProvider {
  async chat(messages: AIMessage[]) {
    return "Şimdilik dummy cevap: Sistem bağlanınca gerçek öneriler döneceğim.";
  }
}