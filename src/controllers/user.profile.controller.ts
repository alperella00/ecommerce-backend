import { Request, Response } from "express";
import { z } from "zod";
import User from "../models/User";

export async function listMyAddresses(req: Request, res: Response) {
  if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await User.findById(req.userId).select("addresses");
  return res.json({ items: user?.addresses || [] });
}

const addressSchema = z.object({
  fullName: z.string().optional(),
  line1: z.string().min(2),
  line2: z.string().optional(),
  city: z.string().min(2),
  country: z.string().min(2),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional()
});

export async function addMyAddress(req: Request, res: Response) {
  if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
  const user = await User.findByIdAndUpdate(req.userId, { $push: { addresses: parsed.data } }, { new: true });
  return res.status(201).json({ items: user?.addresses || [] });
}

export async function removeMyAddress(req: Request, res: Response) {
  if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
  const id = String(req.params.id);
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.addresses = (user.addresses || []).filter((_, idx) => String(idx) !== id);
  await user.save();
  return res.json({ items: user.addresses });
}

