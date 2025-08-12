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

export async function updateCategory(req: Request, res: Response) {
  const id = String((req as any).params.id);
  const { name, slug, description, image, active, sortOrder } = (req as any).body || {};
  const update: any = {};
  if (name !== undefined) update.name = name;
  if (slug !== undefined) update.slug = slug;
  if (description !== undefined) update.description = description;
  if (image !== undefined) update.image = image;
  if (active !== undefined) update.active = active;
  if (sortOrder !== undefined) update.sortOrder = sortOrder;
  const doc = await Category.findByIdAndUpdate(id, update, { new: true });
  if (!doc) return res.status(404).json({ message: "Not found" });
  return res.json({ item: doc });
}

export async function deleteCategory(req: Request, res: Response) {
  const id = String((req as any).params.id);
  const doc = await Category.findByIdAndDelete(id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  return res.json({ ok: true });
}