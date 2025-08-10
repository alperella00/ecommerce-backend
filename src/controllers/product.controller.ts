import { Request, Response } from "express";
import Product from "../models/Product";
import { z } from "zod";

export const listProductsSchema = z.object({
  query: z.object({
    categoryId: z.string().optional(),
    q: z.string().optional(),
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
    sort: z.enum(["price_asc", "price_desc", "newest"]).optional(),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(12)
  })
});

export async function listProducts(req: Request, res: Response) {
  const { categoryId, q, min, max, sort, page, limit } = req.query as any;

  const filter: any = {};
  if (categoryId) filter.categoryId = categoryId;
  if (q) filter.$text ? (filter.$text.$search = q) : (filter.name = new RegExp(q, "i"));
  if (min || max) filter.price = { ...(min && { $gte: Number(min) }), ...(max && { $lte: Number(max) }) };

  const sortMap: any = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    newest: { createdAt: -1 }
  };

  const items = await Product.find(filter)
    .sort(sort ? sortMap[sort] : { createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const total = await Product.countDocuments(filter);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
}

export async function getBySlug(req: Request, res: Response) {
  const item = await Product.findOne({ slug: req.params.slug });
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json({ item });
}

const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    price: z.number().nonnegative(),
    stock: z.number().int().nonnegative().default(0),
    description: z.string().optional()
  })
});

export async function createProduct(req: any, res: any) {
  const parse = createProductSchema.safeParse({ body: req.body });
  if (!parse.success) {
    return res.status(400).json({ message: "Validation error", errors: parse.error.flatten() });
  }

  try {
    const imageUrl = req.file?.path || null;

    const product = await Product.create({
      ...parse.data.body,
      imageUrl
    });

    return res.status(201).json({ product });
  } catch (err) {
    console.error("createProduct error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}