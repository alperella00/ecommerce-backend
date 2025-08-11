import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
// import mongoSanitize from "express-mongo-sanitize"; // removed
import { sanitizeRequest } from "./middlewares/sanitize.middleware";
import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";
import cartRoutes from "./routes/cart.routes";
import wishlistRoutes from "./routes/wishlist.routes";
import reviewRoutes from "./routes/review.routes";
import productRecoRoutes from "./routes/product.reco.routes";
import aiRoutes from "./routes/ai.routes";
import path from "path";
import { UPLOADS_PUBLIC_URL, UPLOADS_ABS_DIR } from "./config/upload";

dotenv.config();

const app = express();

// parsers
app.use(express.json());

// cors
const origins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));

// security & logs
app.use(helmet());
app.use(morgan("dev"));
app.use(sanitizeRequest); // in-place sanitization compatible with Express 5

// rate limit (auth only)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/register", authLimiter);

// routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/wishlist", wishlistRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/products", productRecoRoutes);
app.use("/api/v1/ai", aiRoutes);

// static uploads
app.use(
  UPLOADS_PUBLIC_URL,
  (req, res, next) => {
    // Basic cache headers for images
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    next();
  },
  require("express").static(UPLOADS_ABS_DIR)
);

// health
app.get("/health", (_req, res) => {
  res.json({ ok: true, dbState: mongoose.connection.readyState });
});

export default app;