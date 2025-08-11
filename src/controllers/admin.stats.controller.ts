import { Request, Response } from "express";
import mongoose from "mongoose";
import Order from "../models/order.model";
import User from "../models/User";
import Product from "../models/Product";

export async function getOverviewStats(req: Request, res: Response) {
  // total sales, total orders, total customers
  const [salesAgg, orderCount, userCount] = await Promise.all([
    Order.aggregate([
      { $unwind: "$items" },
      { $group: { _id: null, totalSales: { $sum: { $multiply: ["$items.price", "$items.qty"] } } } }
    ]),
    Order.countDocuments({}),
    User.countDocuments({})
  ]);

  const totalSales = salesAgg[0]?.totalSales ?? 0;
  return res.json({ totalSales, totalOrders: orderCount, totalCustomers: userCount });
}

export async function getSalesLast7Days(req: Request, res: Response) {
  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from } } },
    { $unwind: "$items" },
    { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        sales: { $sum: { $multiply: ["$items.price", "$items.qty"] } },
        orders: { $addToSet: "$_id" }
      }
    },
    { $project: { date: "$_id", _id: 0, sales: 1, ordersCount: { $size: "$orders" } } },
    { $sort: { date: 1 } }
  ]);

  return res.json({ range: 7, data: rows });
}

export async function getTopProducts(req: Request, res: Response) {
  const limit = Math.min(20, Math.max(1, Number(req.query.limit || 10)));
  const agg = await Order.aggregate([
    { $unwind: "$items" },
    { $group: { _id: "$items.product", qty: { $sum: "$items.qty" } } },
    { $sort: { qty: -1 } },
    { $limit: limit }
  ]);

  const ids = agg.map(a => a._id).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids } })
    .select("name price mainImage imageUrl ratingAvg ratingCount");

  // keep original order
  const map = new Map(products.map(p => [String(p._id), p]));
  const ordered = ids.map(id => map.get(String(id))).filter(Boolean);

  return res.json({ products: ordered });
}