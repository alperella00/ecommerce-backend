import { Request, Response } from "express";
import { z } from "zod";
import Review from "../models/review.model";
import Product from "../models/Product";

const createSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional()
  }),
  params: z.object({
    id: z.string().min(1) // product id
  })
});

export async function createReview(req: Request, res: Response) {
  const parsed = createSchema.safeParse({ body: req.body, params: req.params });
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
  }
  const { rating, comment } = parsed.data.body;
  const productId = parsed.data.params.id;
  const userId = req.userId;

  // Ürün var mı?
  const product = await Product.findById(productId).select("_id");
  if (!product) return res.status(404).json({ message: "Product not found" });

  try {
    const review = await Review.create({
      product: product._id,
      user: userId,
      rating,
      comment,
      approved: false
    });

    // Admin onayına düştü (approved=false). İstersen otomatik onay için approved:true yapabilirsin.
    return res.status(201).json({ review, message: "Review submitted and awaits approval" });
  } catch (err: any) {
    // unique index tekrar denemesinde yakalanır
    if (err?.code === 11000) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }
    console.error("createReview error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

const listSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    approved: z.enum(["true", "false"]).optional()
  })
});

export async function listProductReviews(req: Request, res: Response) {
  const parsed = listSchema.safeParse({ params: req.params, query: req.query });
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
  }
  const productId = parsed.data.params.id;
  const page = parsed.data.query.page ?? 1;
  const limit = parsed.data.query.limit ?? 10;
  const skip = (page - 1) * limit;
  const approved = parsed.data.query.approved;

  const q: any = { product: productId };
  if (approved) q.approved = approved === "true";

  const [items, total] = await Promise.all([
    Review.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("user", "email"),
    Review.countDocuments(q)
  ]);

  return res.json({
    page, limit, total, pages: Math.ceil(total / limit),
    reviews: items
  });
}

const approveSchema = z.object({
  params: z.object({ reviewId: z.string().min(1) }),
  body: z.object({ approved: z.boolean() })
});

// Product.ratingAvg & ratingCount güncelle
async function recomputeProductRatings(productId: string) {
  const stats = await Review.aggregate([
    { $match: { product: new (require("mongoose").Types.ObjectId)(productId), approved: true } },
    { $group: { _id: "$product", avg: { $avg: "$rating" }, count: { $sum: 1 } } }
  ]);
  const avg = stats[0]?.avg ?? 0;
  const count = stats[0]?.count ?? 0;
  await Product.findByIdAndUpdate(productId, { ratingAvg: avg, ratingCount: count }, { new: true });
}

export async function approveReview(req: Request, res: Response) {
  const parsed = approveSchema.safeParse({ params: req.params, body: req.body });
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
  }
  const { reviewId } = parsed.data.params;
  const { approved } = parsed.data.body;

  const review = await Review.findByIdAndUpdate(reviewId, { approved }, { new: true });
  if (!review) return res.status(404).json({ message: "Review not found" });

  // Onay/ret sonrası üründeki istatistikleri güncelle
  await recomputeProductRatings(String(review.product));

  return res.json({ review });
}