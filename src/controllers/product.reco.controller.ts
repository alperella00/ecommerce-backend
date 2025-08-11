import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/order.model";
import Product from "../models/Product";
import Activity from "../models/activity.model";

/** GET /api/v1/products/popular?limit=10
 * Siparişlere göre en çok satan ürünler
 */
export async function getPopularProducts(req: Request, res: Response) {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));

  const top = await Order.aggregate([
    { $unwind: "$items" },
    { $group: { _id: "$items.product", qty: { $sum: "$items.qty" } } },
    { $sort: { qty: -1 } },
    { $limit: limit }
  ]);

  const ids = top.map(t => t._id).filter(Boolean);
  const docs = await Product.find({ _id: { $in: ids } })
    .select("name price mainImage imageUrl ratingAvg ratingCount tags categoryId");

  // sıralamayı qty’ye göre koru
  const map = new Map(docs.map(d => [String(d._id), d]));
  const ordered = top.map(t => map.get(String(t._id))).filter(Boolean);

  return res.json({ products: ordered, total: ordered.length });
}

/** GET /api/v1/products/:id/related?limit=10
 * Aynı kategori + ortak tag'ler
 */
export async function getRelatedProducts(req: Request, res: Response) {
  const id = String(req.params.id);
  const limit = Math.min(20, Math.max(1, Number(req.query.limit || 10)));
  const current = await Product.findById(id).select("categoryId tags");
  if (!current) return res.status(404).json({ message: "Product not found" });

  const q: any = { _id: { $ne: current._id }, categoryId: current.categoryId };
  if (current.tags?.length) {
    q.tags = { $in: current.tags.slice(0, 5) };
  }

  const docs = await Product.find(q)
    .select("name price mainImage imageUrl ratingAvg ratingCount tags categoryId")
    .limit(limit);

  return res.json({ products: docs });
}

/** POST /api/v1/products/:id/view
 * Kullanıcı ürün detayına bakınca FE bu endpoint’i çağırır
 */
export async function trackProductView(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const productId = String(req.params.id);
  const exists = await Product.exists({ _id: productId });
  if (!exists) return res.status(404).json({ message: "Product not found" });

  await Activity.create({
    user: new mongoose.Types.ObjectId(userId),
    product: new mongoose.Types.ObjectId(productId),
    type: "view"
  });

  return res.status(204).send();
}

/** GET /api/v1/products/recently-viewed?limit=10
 * Kullanıcının son görüntülediği ürünler (unique, en yeni önce)
 */
export async function getRecentlyViewed(req: Request, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const limit = Math.min(30, Math.max(1, Number(req.query.limit || 10)));

  // Son aktivitelerden unique productId listesi
  const rows = await Activity.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), type: "view" } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$product", last: { $first: "$createdAt" } } },
    { $sort: { last: -1 } },
    { $limit: limit }
  ]);

  const ids = rows.map(r => r._id);
  const products = await Product.find({ _id: { $in: ids } })
    .select("name price mainImage imageUrl ratingAvg ratingCount tags categoryId");

  // original order’ı koru
  const map = new Map(products.map(p => [String(p._id), p]));
  const ordered = ids.map(id => map.get(String(id))).filter(Boolean);

  return res.json({ products: ordered });
}

/** GET /api/v1/products/:id/frequently-bought-together?limit=8
 * Aynı siparişte birlikte geçen ürünler (co-occurrence)
 */
export async function getFrequentlyBoughtTogether(req: Request, res: Response) {
  const productId = new mongoose.Types.ObjectId(String(req.params.id));
  const limit = Math.min(20, Math.max(1, Number(req.query.limit || 8)));

  const agg = await Order.aggregate([
    { $match: { "items.product": productId } },
    { $unwind: "$items" },
    { $match: { "items.product": { $ne: productId } } },
    { $group: { _id: "$items.product", togetherQty: { $sum: "$items.qty" }, count: { $sum: 1 } } },
    { $sort: { togetherQty: -1, count: -1 } },
    { $limit: limit }
  ]);

  const ids = agg.map(a => a._id);
  const products = await Product.find({ _id: { $in: ids } })
    .select("name price mainImage imageUrl ratingAvg ratingCount tags categoryId");

  // order’ı koru
  const map = new Map(products.map(p => [String(p._id), p]));
  const ordered = ids.map(id => map.get(String(id))).filter(Boolean);

  return res.json({ products: ordered });
}