import { Request, Response } from "express";
import Order from "../models/order.model";
import User from "../models/User";
import { z } from "zod";
import { sendMail } from "../services/mail";
import mongoose from "mongoose";
import Product from "../models/Product";

const orderItemSchema = z.object({
  product: z.string().min(1),
  name: z.string().min(1),
  qty: z.number().int().positive(),
  price: z.number().nonnegative()
});

const createOrderSchema = z.object({
  body: z.object({
    shippingAddress: z.string().min(5),
    items: z.array(orderItemSchema).min(1)
  })
});

export async function createOrder(req: any, res: any) {
  const parse = createOrderSchema.safeParse({ body: req.body });
  if (!parse.success) {
    return res.status(400).json({ message: "Validation error", errors: parse.error.flatten() });
  }
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const { shippingAddress, items } = parse.data.body;
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const session = await mongoose.startSession();
  try {
    let orderDoc: any;
    await session.withTransaction(async () => {
      // Atomik stok düşme: her item için stock >= qty koşullu $inc:-qty
      for (const it of items) {
        const dec = await Product.updateOne(
          { _id: it.product, stock: { $gte: it.qty } },
          { $inc: { stock: -it.qty } }
        ).session(session);
        if (dec.modifiedCount === 0) {
          throw new Error(`INSUFFICIENT_STOCK:${it.product}`);
        }
      }

      orderDoc = await Order.create(
        [
          {
            user: userId,
            items,
            shippingAddress,
            total,
            status: "confirmed"
          }
        ],
        { session }
      );
    });

    const order = Array.isArray(orderDoc) ? orderDoc[0] : orderDoc;

    // e-posta
    const user = await User.findById(userId).select("email");
    if (user?.email) {
      const productListHtml = items.map(i => `<li>${i.name} × ${i.qty} — $${i.price}</li>`).join("");
      const html = `
        <h2>Order Confirmation</h2>
        <ul>${productListHtml}</ul>
        <p><strong>Total:</strong> $${total.toFixed(2)}</p>
        <p><strong>Shipping Address:</strong> ${shippingAddress}</p>
      `;
      await sendMail(user.email, "Order Confirmation", html);
    }

    return res.status(201).json({ order });
  } catch (err: any) {
    if (typeof err.message === "string" && err.message.startsWith("INSUFFICIENT_STOCK:")) {
      return res.status(400).json({ message: "Insufficient stock for one or more products" });
    }
    console.error("createOrder tx error:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    session.endSession();
  }
}

/* ===== ME: list my orders (pagination) ===== */
export async function listMyOrders(req: Request, res: Response) {
  if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Order.find({ user: req.userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ user: req.userId })
  ]);

  return res.json({
    page, limit, total, pages: Math.ceil(total / limit),
    orders: items
  });
}

/* ===== Get order by id (owner or admin) ===== */
export async function getOrderById(req: Request, res: Response) {
  if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
  const id = String(req.params.id);
  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const isOwner = order.user.toString() === req.userId;
  const isAdmin = req.userRole === "admin";
  if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

  return res.json({ order });
}

/* ===== Admin: list all orders (filters + pagination) ===== */
export async function listOrdersAdmin(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
  const skip = (page - 1) * limit;
  const status = req.query.status ? String(req.query.status) : undefined;

  const q: any = {};
  if (status) q.status = status;

  const [items, total] = await Promise.all([
    Order.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(q)
  ]);

  return res.json({
    page, limit, total, pages: Math.ceil(total / limit),
    orders: items
  });
}

/* ===== Admin: update status ===== */
const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(["pending", "confirmed", "shipped", "delivered"]) 
  })
});

export async function updateOrderStatus(req: Request, res: Response) {
  const parse = updateStatusSchema.safeParse({ body: req.body });
  if (!parse.success) {
    return res.status(400).json({ message: "Validation error", errors: parse.error.flatten() });
  }
  const id = String(req.params.id);
  const order = await Order.findByIdAndUpdate(
    id,
    { status: parse.data.body.status },
    { new: true }
  );
  if (!order) return res.status(404).json({ message: "Order not found" });

  // optional: send shipped/delivered notification
  if (parse.data.body.status === "shipped" || parse.data.body.status === "delivered") {
    const user = await User.findById(order.user).select("email");
    if (user?.email) {
      const subj = parse.data.body.status === "shipped" ? "Your order has shipped" : "Your order was delivered";
      await sendMail(user.email, subj, `<p>Order <strong>${order.id}</strong> status: ${order.status}</p>`);
    }
  }

  return res.json({ order });
}