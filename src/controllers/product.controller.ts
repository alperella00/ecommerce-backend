import { Request, Response } from "express";
import Product from "../models/Product";
import { z } from "zod";

export const listProductsSchema = z.object({
  query: z.object({
    categoryId: z.string().optional(),
    category: z.string().optional(),
    q: z.string().optional(),
    search: z.string().optional(),
    name: z.string().optional(),
    min: z.coerce.number().optional(),
    max: z.coerce.number().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sort: z.enum(["price_asc", "price_desc", "newest", "rating:desc", "price:asc", "price:desc"]).optional(),
    page: z.coerce.number().default(1),
    pageNumber: z.coerce.number().optional(),
    limit: z.coerce.number().default(12)
  })
});

export async function listProducts(req: Request, res: Response) {
  const { categoryId, category, q, search, name, min, max, minRating } = req.query as any;
  let { sort, page, pageNumber, limit } = req.query as any;

  const filter: any = {};
  const cat = categoryId || category;
  if (cat) filter.categoryId = cat;
  const term = q || search || name;
  if (term) filter.name = new RegExp(term, "i");
  if (min || max) filter.price = { ...(min && { $gte: Number(min) }), ...(max && { $lte: Number(max) }) };
  if (minRating) filter.ratingAvg = { $gte: Number(minRating) };

  const sortMap: any = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    newest: { createdAt: -1 },
    "price:asc": { price: 1 },
    "price:desc": { price: -1 },
    "rating:desc": { averageRating: -1 }
  };

  const currentPage = Number(pageNumber || page || 1);

  const items = await Product.find(filter)
    .sort(sort ? sortMap[sort as keyof typeof sortMap] ?? { createdAt: -1 } : { createdAt: -1 })
    .skip((Number(currentPage) - 1) * Number(limit))
    .limit(Number(limit));

  const total = await Product.countDocuments(filter);
  res.json({ items, total, page: Number(currentPage), limit: Number(limit) });
}

export async function getBySlug(req: Request, res: Response) {
  const key = req.params.slug;
  let item = null as any;
  try {
    // Try by ObjectId first if valid
    const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(key);
    item = isValidObjectId ? await Product.findById(key) : null;
  } catch {}
  if (!item) {
    item = await Product.findOne({ slug: key });
  }
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
}

const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    price: z.number().nonnegative(),
    stock: z.number().int().nonnegative().default(0),
    description: z.string().optional(),
    image: z.string().url().optional(),
    images: z.array(z.object({ url: z.string().url().optional() }).optional()).optional(),
    categoryId: z.string().min(1, "categoryId required"),
    tags: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    featured: z.boolean().optional()
  })
});

export async function createProduct(req: any, res: any) {
  const body = typeof req.body === "object" ? req.body : {};
  if (typeof body.stock === "string") body.stock = Number(body.stock);
  if (typeof body.price === "string") body.price = Number(body.price);
  const parse = createProductSchema.safeParse({ body });
  if (!parse.success) {
    return res.status(400).json({ message: "Validation error", errors: parse.error.flatten() });
  }

  try {
    const imageUrl = req.file?.path || parse.data.body.image || parse.data.body.images?.[0]?.url || undefined;

    // generate slug from name
    const makeSlug = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    let base = makeSlug(parse.data.body.name);
    if (!base) base = "product";
    let slug = base;
    const exists = await Product.exists({ slug });
    if (exists) slug = `${base}-${Date.now().toString(36)}`;

    const product = await Product.create({
      ...parse.data.body,
      slug,
      imageUrl
    });

    return res.status(201).json({ product });
  } catch (err) {
    console.error("createProduct error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

const updateProductSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().min(2).optional(),
    price: z.number().nonnegative().optional(),
    stock: z.number().int().nonnegative().optional(),
    description: z.string().optional(),
    image: z.string().url().optional(),
    images: z.array(z.object({ url: z.string().url().optional() }).optional()).optional(),
    categoryId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    featured: z.boolean().optional()
  }).optional()
});

export async function updateProduct(req: any, res: any) {
  // accept either JSON body or multipart with fields strings
  const body = typeof req.body === "object" ? req.body : {};
  if (typeof body.stock === "string") body.stock = Number(body.stock);
  if (typeof body.price === "string") body.price = Number(body.price);
  const parse = updateProductSchema.safeParse({ params: req.params, body });
  if (!parse.success) {
    return res.status(400).json({ message: "Validation error", errors: parse.error.flatten() });
  }
  const { id } = parse.data.params;
  const update: any = { ...(parse.data.body || {}) };
  if (req.file?.path) update.imageUrl = req.file.path;
  if (!update.imageUrl && update.image) update.imageUrl = update.image;
  if (!update.imageUrl && update.images?.[0]?.url) update.imageUrl = update.images[0].url;
  delete update.image;
  try {
    const doc = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json({ product: doc });
  } catch (err) {
    console.error("updateProduct error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function deleteProduct(req: Request, res: Response) {
  try {
    const doc = await Product.findByIdAndDelete((req.params as any).id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteProduct error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/* ===== Bulk update (admin) ===== */
const bulkSchema = z.object({
  body: z.object({
    ids: z.array(z.string().min(1)).min(1),
    isActive: z.boolean().optional(),
    featured: z.boolean().optional()
  })
});

export async function bulkUpdateProducts(req: Request, res: Response) {
  const parsed = bulkSchema.safeParse({ body: req.body });
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
  }
  const { ids, isActive, featured } = parsed.data.body;
  const update: any = {};
  if (typeof isActive === "boolean") update.isActive = isActive;
  if (typeof featured === "boolean") update.featured = featured;
  if (!Object.keys(update).length) return res.status(400).json({ message: "No update fields" });
  await Product.updateMany({ _id: { $in: ids } }, { $set: update });
  return res.json({ ok: true });
}