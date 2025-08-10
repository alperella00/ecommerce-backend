import { ZodTypeAny } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate =
  (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: parsed.error.issues,
      });
    }

    // Optionally attach parsed data for downstream handlers
    // (req as any).validated = parsed.data;
    return next();
  };