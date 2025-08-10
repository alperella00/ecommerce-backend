import { Router } from "express";
import { createCategory, listCategories, upsertCategorySchema } from "../controllers/category.controller";
import { validate } from "../middlewares/validate.middleware";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware";

const r = Router();

r.get("/", listCategories);
r.post("/", requireAuth, requireAdmin, validate(upsertCategorySchema), createCategory);

export default r;