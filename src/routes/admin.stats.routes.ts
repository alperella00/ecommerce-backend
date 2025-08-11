import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";
import { getOverviewStats, getSalesLast7Days, getTopProducts } from "../controllers/admin.stats.controller";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/overview", getOverviewStats);
router.get("/sales-last7", getSalesLast7Days);
router.get("/top-products", getTopProducts);

export default router;