import dotenv from "dotenv";
dotenv.config();

console.log("SMTP_USER =>", process.env.SMTP_USER);
import app from "./app";
import mongoose from "mongoose";

const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI as string | undefined;

// Start HTTP server immediately so /health works even if DB isn't ready
const server = app.listen(PORT, () => {
  console.log(`🚀 API listening on :${PORT}`);
});

(async () => {
  if (!MONGODB_URI) {
    console.warn("⚠️  MONGODB_URI is not set. API is up, but DB-dependent routes will fail until you set it.");
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err);
    console.warn("API continues to run for /health. Set MONGODB_URI and restart.");
  }
})();

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  server.close(() => process.exit(0));
});