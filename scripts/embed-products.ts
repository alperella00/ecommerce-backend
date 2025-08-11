import "dotenv/config";
import mongoose from "mongoose";
import Product from "../src/models/Product";

const PROVIDER = (process.env.AI_PROVIDER || "openai").toLowerCase();
const OPENAI_URL = "https://api.openai.com/v1/embeddings";
const OPENAI_MODEL = "text-embedding-3-small";
const API_KEY = process.env.AI_API_KEY!;

async function embed(text: string): Promise<number[]> {
  const resp = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: OPENAI_MODEL, input: text })
  });
  const json = await resp.json();
  return json.data?.[0]?.embedding || [];
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const products = await Product.find().select("_id name description tags");
  for (const p of products) {
    const text = [p.name, p.description, (p as any).tags?.join(" ")].filter(Boolean).join(" | ");
    const vec = await embed(text);
    await Product.updateOne({ _id: p._id }, { $set: { embedding: vec } });
    console.log("embedded:", p._id, p.name);
  }
  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });