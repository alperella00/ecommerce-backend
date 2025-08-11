import { Router } from "express";
import { aiRecommend } from "../controllers/ai.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// guest da olabilir, ama istersen requireAuth ekle
router.post("/recommend", aiRecommend);

export default router;