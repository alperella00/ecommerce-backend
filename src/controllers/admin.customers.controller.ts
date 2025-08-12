import { Request, Response } from "express";
import { z } from "zod";
import User from "../models/User";

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    q: z.string().optional()
  })
});

export async function listCustomers(req: Request, res: Response) {
  const parse = listSchema.safeParse({ query: req.query });
  if (!parse.success) {
    return res.status(400).json({ message: "Validation error", errors: parse.error.issues });
  }
  const page = parse.data.query.page ?? 1;
  const limit = parse.data.query.limit ?? 20;
  const skip = (page - 1) * limit;
  const q = parse.data.query.q?.trim();

  const filter: any = { role: "customer" };
  if (q) {
    const rx = new RegExp(q, "i");
    filter.$or = [
      { email: rx },
      { firstName: rx },
      { lastName: rx }
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("email firstName lastName createdAt role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter)
  ]);

  return res.json({ items, page, limit, total });
}

