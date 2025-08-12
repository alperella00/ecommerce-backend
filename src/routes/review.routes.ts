import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/auth.middleware";
import { createReview, listProductReviews, approveReview, listAllReviewsAdmin } from "../controllers/review.controller";

const router = Router();

// Admin: tüm yorumlar (moderasyon)
router.get("/", requireAuth, requireAdmin, listAllReviewsAdmin);

// Public: ürünün onaylı/onaysız yorumlarını listeleme (query ile filtre)
router.get("/product/:id", listProductReviews);

// Auth user: ürün için review oluştur (tekil kısıt modelde index ile)
router.post("/product/:id", requireAuth, createReview);

// Admin: review onay/ret
router.patch("/:reviewId/approve", requireAuth, requireAdmin, approveReview);

export default router;