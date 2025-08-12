import express from "express";
import { upload } from "../config/upload";
import { createProduct, listProducts, getBySlug, updateProduct, deleteProduct, bulkUpdateProducts } from "../controllers/product.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = express.Router();

// List products
router.get("/", listProducts);

// Get by slug (or identifier interpreted as slug)
router.get("/:slug", getBySlug);

// Create (admin only)
router.post("/", authMiddleware, adminMiddleware, upload.single("image"), createProduct);

// Update/Delete (admin only)
router.patch("/:id", authMiddleware, adminMiddleware, upload.single("image"), updateProduct);
router.delete("/:id", authMiddleware, adminMiddleware, deleteProduct);

// Bulk (admin)
router.post("/bulk", authMiddleware, adminMiddleware, bulkUpdateProducts);

export default router;