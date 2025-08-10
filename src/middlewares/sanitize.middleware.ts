import { Request, Response, NextFunction } from "express";

// Mutates objects in-place to remove Mongo operator keys like "$" and dotted keys.
function stripDangerousKeys(obj: any): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) stripDangerousKeys(item);
    return;
  }
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete (obj as Record<string, any>)[key];
      continue;
    }
    stripDangerousKeys((obj as Record<string, any>)[key]);
  }
}

export function sanitizeRequest(req: Request, _res: Response, next: NextFunction) {
  try {
    if (req.body) stripDangerousKeys(req.body);
    if (req.params) stripDangerousKeys(req.params as any);
    if (req.query) stripDangerousKeys(req.query as any); // IMPORTANT: mutate in-place; do not reassign req.query
  } catch {
    // best-effort
  }
  next();
}