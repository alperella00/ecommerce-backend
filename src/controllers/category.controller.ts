import { Request, Response } from "express";
import Category from "../models/Category";
import { z } from "zod";

export const upsertCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    image: z.string().url().optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().optional()
  })
});

export async function listCategories(_req: Request, res: Response) {
  const items = await Category.find({}).sort({ sortOrder: 1, name: 1 });
  res.json({ items });
}

export async function createCategory(req: Request, res: Response) {
  const doc = await Category.create(req.body);
  res.status(201).json({ item: doc });
}