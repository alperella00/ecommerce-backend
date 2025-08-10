import { Request, Response } from "express";
import { z } from "zod";
import Cart from "../models/cart.model";
import Product from "../models/Product";
import Order from "../models/order.model";
import User from "../models/User";
import { sendMail } from "../services/mail";
import mongoose from "mongoose";

function calcTotal(items: { priceSnapshot: number; qty: number }[]) {
  return items.reduce((s, i) => s + i.priceSnapshot * i.qty, 0);
}

/* GET /api/v1/cart */
export async function getMyCart(req: Request, res: Response) {
  const userId = req.userId;
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return res.json({ cart, total: calcTotal(cart.items) });
}

/* POST /api/v1/cart/items { productId, qty } */
const addSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    qty: z.number().int().positive().default(1)
  })
});

export async function addToCart(req: Request, res: Response) {
  const parse = addSchema.safeParse({ body: req.body });
  if (!parse.success) return res.status(400).json({ message: "Validation error", errors: parse.error.flatten() });

  const { productId, qty } = parse.data.body;
  const userId = req.userId;

  const product = await Product.findById(productId).select("name price");
  if (!product) return res.status(404).json({ message: "Product not found" });

  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });

  const idx = cart.items.findIndex((i) => String(i.product) === String(product._id));
  if (idx >= 0) {
    cart.items[idx].qty += qty;
    cart.items[idx].priceSnapshot = product.price; // refresh snapshot
    cart.items[idx].nameSnapshot = product.name;
  } else {
    cart.items.push({
      product: product._id,
      qty,
      priceSnapshot: product.price,
      nameSnapshot: product.name
    } as any);
  }
  await cart.save();
  return res.status(200).json({ cart, total: calcTotal(cart.items) });
}

/* PATCH /api/v1/cart/items/:productId { qty } */
const patchSchema = z.object({
  body: z.object({ qty: z.number().int().positive() }),
  params: z.object({ productId: z.string().min(1) })
});

export async function updateCartItem(req: Request, res: Response) {
  const parse = patchSchema.safeParse({ body: req.body, params: req.params });
  if (!parse.success) return res.status(400).json({ message: "Validation error", errors: parse.error.flatten() });
  const { productId } = parse.data.params;
  const { qty } = parse.data.body;

  const cart = await Cart.findOne({ user: req.userId });
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  const idx = cart.items.findIndex((i) => String(i.product) === productId);
  if (idx < 0) return res.status(404).json({ message: "Item not in cart" });
  cart.items[idx].qty = qty;
  await cart.save();
  return res.json({ cart, total: calcTotal(cart.items) });
}

/* DELETE /api/v1/cart/items/:productId */
export async function removeCartItem(req: Request, res: Response) {
  const productId = String(req.params.productId);
  const cart = await Cart.findOne({ user: req.userId });
  if (!cart) return res.status(404).json({ message: "Cart not found" });
  cart.items = cart.items.filter((i) => String(i.product) !== productId);
  await cart.save();
  return res.json({ cart, total: calcTotal(cart.items) });
}

/* POST /api/v1/cart/checkout { shippingAddress } -> creates Order from cart (dummy payment) */
const checkoutSchema = z.object({
  body: z.object({
    shippingAddress: z.string().min(5)
  })
});

export async function checkout(req: any, res: any) {
  const parse = checkoutSchema.safeParse({ body: req.body });
  if (!parse.success) return res.status(400).json({ message: "Validation error", errors: parse.error.flatten() });

  const userId = req.userId;
  const cart = await Cart.findOne({ user: userId });
  if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Cart is empty" });

  const items = cart.items.map(i => ({
    product: i.product,
    name: i.nameSnapshot,
    qty: i.qty,
    price: i.priceSnapshot
  }));
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  const session = await mongoose.startSession();
  try {
    let orderDoc: any;
    await session.withTransaction(async () => {
      // Atomik stok düşme
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
            shippingAddress: parse.data.body.shippingAddress,
            total,
            status: "confirmed"
          }
        ],
        { session }
      );

      // Sepeti temizle
      await Cart.updateOne({ user: userId }, { $set: { items: [] } }).session(session);
    });

    const order = Array.isArray(orderDoc) ? orderDoc[0] : orderDoc;

    // e-posta
    const user = await User.findById(userId).select("email");
    if (user?.email) {
      const list = items.map(i => `<li>${i.name} × ${i.qty} — $${i.price}</li>`).join("");
      await sendMail(
        user.email,
        "Order Confirmation",
        `<h2>Order Confirmation</h2><ul>${list}</ul><p><b>Total:</b> $${total.toFixed(2)}</p>`
      );
    }

    return res.status(201).json({ order });
  } catch (err: any) {
    if (typeof err.message === "string" && err.message.startsWith("INSUFFICIENT_STOCK:")) {
      return res.status(400).json({ message: "Insufficient stock for one or more products" });
    }
    console.error("checkout tx error:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    session.endSession();
  }
}