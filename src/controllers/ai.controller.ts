import { Request, Response } from "express";
import { getAI } from "../services/ai.factory";
import AISession from "../models/aiSession.model";
import Product from "../models/Product";
import { z } from "zod";

const sysPrompt = `You are a helpful shopping assistant.
Extract user's needs: use-case, budget, constraints, preferred categories/brands.
If info is missing, briefly ask 1-2 clarifying questions.
Then recommend 3-5 products from the provided candidates. For each, explain WHY it fits in one sentence.
ONLY use products given in the context. Keep answers concise.`;

const reqSchema = z.object({
  body: z.object({
    sessionId: z.string().min(8),
    message: z.string().min(2),
  })
});

function buildMongoVectorQuery(vec: number[], limit: number) {
  return [
    {
      $vectorSearch: {
        index: "product_embedding_index",
        path: "embedding",
        queryVector: vec,
        numCandidates: 100,
        limit
      }
    },
    { $project: { name: 1, price: 1, tags: 1, categoryId: 1, mainImage: 1, imageUrl: 1, score: { $meta: "vectorSearchScore" } } }
  ];
}

export async function aiRecommend(req: Request, res: Response) {
  const parsed = reqSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
  }
  const { sessionId, message } = parsed.data.body;

  // upsert session
  const session = await AISession.findOneAndUpdate(
    { sessionId },
    { $setOnInsert: { history: [] } },
    { upsert: true, new: true }
  );

  // 1) get an intent embedding (cheap way: reuse embedding endpoint)
  const resp = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.AI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: message })
  });
  const embJson = await resp.json();
  const qvec = embJson.data?.[0]?.embedding || [];

  // 2) vector search (fallback: if disabled, do simple text search)
  let candidates: any[] = [];
  if (process.env.VECTOR_SEARCH_ENABLED === "true" && qvec.length) {
    candidates = await Product.aggregate(buildMongoVectorQuery(qvec, 12));
  } else {
    candidates = await Product.find({ name: { $regex: message, $options: "i" } }).limit(12);
  }

  // 3) LLM re-rank & answer
  const ai = await getAI();
  const context = candidates.map((c, i) => `${i + 1}. ${c.name} | $${c.price} | tags:${(c.tags||[]).join(",")}`).join("\n");
  const messages = [
    { role: "system", content: sysPrompt },
    { role: "user", content: `User says: \"\"\"${message}\"\"\" \nCandidate products:\n${context}\nReturn JSON: { "summary": string, "recommendations":[{ "name": string, "reason": string }] }` }
  ] as const;

  const raw = await ai.chat(messages as any);
  // try parse
  let parsedAnswer: any;
  try { parsedAnswer = JSON.parse(raw); } catch { parsedAnswer = { summary: raw, recommendations: [] }; }

  // store history
  session.history.push({ role: "user", content: message });
  session.history.push({ role: "assistant", content: typeof raw === "string" ? raw : JSON.stringify(raw) });
  await session.save();

  return res.json({
    sessionId,
    answer: parsedAnswer,
    products: candidates
  });
}