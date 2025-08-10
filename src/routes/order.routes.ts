import { Router } from "express";
import {
  createOrder,
  listMyOrders,
  getOrderById,
  listOrdersAdmin,
  updateOrderStatus
} from "../controllers/order.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

// Customer
router.post("/", requireAuth, createOrder);
router.get("/", requireAuth, listMyOrders);
router.get("/:id", requireAuth, getOrderById);

// Admin
router.get("/admin/list", requireAuth, requireAdmin, listOrdersAdmin);
router.patch("/:id/status", requireAuth, requireAdmin, updateOrderStatus);

export default router;