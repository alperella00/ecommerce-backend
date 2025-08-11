import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  getPopularProducts,
  getRelatedProducts,
  trackProductView,
  getRecentlyViewed,
  getFrequentlyBoughtTogether
} from "../controllers/product.reco.controller";

const router = Router();

router.get("/popular", getPopularProducts);
router.get("/:id/related", getRelatedProducts);

// activity
router.post("/:id/view", requireAuth, trackProductView);
router.get("/recently-viewed", requireAuth, getRecentlyViewed);

// fbt
router.get("/:id/frequently-bought-together", getFrequentlyBoughtTogether);

export default router;