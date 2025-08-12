import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";
import { listCustomers } from "../controllers/admin.customers.controller";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/", listCustomers);

export default router;

