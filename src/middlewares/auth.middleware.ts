import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  const token = auth.split(" ")[1];
  try {
    const decoded = verifyJwt(token);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.userRole !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}