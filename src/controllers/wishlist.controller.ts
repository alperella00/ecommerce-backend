import { Request, Response } from "express";
import { z } from "zod";
import Wishlist from "../models/wishlist.model";
import Product from "../models/Product";

export async function getMyWishlist(req: Request, res: Response) {
  const userId = req.userId;
  let wl = await Wishlist.findOne({ user: userId }).populate("products", "name price mainImage imageUrl");
  if (!wl) wl = await Wishlist.create({ user: userId, products: [] });
  return res.json({ wishlist: wl });
}

const mutSchema = z.object({ body: z.object({ productId: z.string().min(1) }) });

export async function addToWishlist(req: Request, res: Response) {
  const parse = mutSchema.safeParse({ body: req.body });
  if (!parse.success) return res.status(400).json({ message: "Validation error", errors: parse.error.issues });

  const userId = req.userId;
  const { productId } = parse.data.body;

  const prod = await Product.findById(productId).select("_id");
  if (!prod) return res.status(404).json({ message: "Product not found" });

  const wl = await Wishlist.findOneAndUpdate(
    { user: userId },
    { $addToSet: { products: prod._id } },   // dedupe
    { upsert: true, new: true }
  ).populate("products", "name price mainImage imageUrl");

  return res.status(200).json({ wishlist: wl });
}

export async function removeFromWishlist(req: Request, res: Response) {
  const parse = mutSchema.safeParse({ body: req.body });
  if (!parse.success) return res.status(400).json({ message: "Validation error", errors: parse.error.issues });

  const userId = req.userId;
  const { productId } = parse.data.body;

  const wl = await Wishlist.findOneAndUpdate(
    { user: userId },
    { $pull: { products: productId } },
    { new: true }
  ).populate("products", "name price mainImage imageUrl");

  if (!wl) return res.status(404).json({ message: "Wishlist not found" });
  return res.json({ wishlist: wl });
}