import express from "express";
import upload from "../middleware/upload";
import { createProduct } from "../controllers/product.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = express.Router();

router.post("/", authMiddleware, adminMiddleware, upload.single("image"), createProduct);

export default router;