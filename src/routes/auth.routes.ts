import { Router } from "express";
import {
  login, me, register,
  loginSchema, registerSchema,
  requestEmailVerification, verifyEmail,
  requestPasswordReset, resetPassword,
  requestPasswordResetSchema, resetPasswordSchema
} from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// Public routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/verify-email", verifyEmail);
router.post("/request-password-reset", validate(requestPasswordResetSchema), requestPasswordReset);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// Protected routes
router.use(requireAuth);
router.post("/request-email-verification", requestEmailVerification);
router.get("/me", me);

export default router;