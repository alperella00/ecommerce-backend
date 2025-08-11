import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { getMyWishlist, addToWishlist, removeFromWishlist } from "../controllers/wishlist.controller";

const router = Router();

router.use(requireAuth);
router.get("/", getMyWishlist);
router.post("/", addToWishlist);
router.delete("/", removeFromWishlist);

export default router;