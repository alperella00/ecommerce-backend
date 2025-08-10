import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  checkout
} from "../controllers/cart.controller";

const router = Router();

router.use(requireAuth);

router.get("/", getMyCart);
router.post("/items", addToCart);
router.patch("/items/:productId", updateCartItem);
router.delete("/items/:productId", removeCartItem);
router.post("/checkout", checkout);

export default router;