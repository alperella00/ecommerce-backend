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

const r = Router();

r.post("/register", validate(registerSchema), register);
r.post("/login", validate(loginSchema), login);
r.get("/me", requireAuth, me);

// email verification
r.post("/request-email-verification", requireAuth, requestEmailVerification);
r.get("/verify-email", verifyEmail);

// password reset
r.post("/request-password-reset", validate(requestPasswordResetSchema), requestPasswordReset);
r.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default r;