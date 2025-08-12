import { Request, Response } from "express";
import User from "../models/User";
import { hashPassword, comparePassword } from "../utils/hash";
import { signJwt } from "../utils/jwt";
import { z } from "zod";
import { generateToken, addMinutes } from "../utils/token";
import { sendMail } from "../services/mail";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().optional(),
    lastName: z.string().optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});

export async function register(req: Request, res: Response) {
  const { email, password, firstName, lastName } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email already in use" });
  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, role: "customer", firstName, lastName });
  const token = signJwt({ userId: user.id, role: user.role });
  return res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  const token = signJwt({ userId: user.id, role: user.role });
  return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
}

export async function me(req: Request, res: Response) {
  if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await User.findById(req.userId).select("email role firstName lastName emailVerified addresses favoriteCategoryIds");
  return res.json({ user });
}

/* ===== Update me (profile) ===== */
export async function updateMe(req: Request, res: Response) {
  if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
  const schema = z.object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    phone: z.string().trim().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
  }
  const update: any = {};
  if (parsed.data.firstName !== undefined) update.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) update.lastName = parsed.data.lastName;
  if (parsed.data.phone !== undefined) update.phone = parsed.data.phone;
  const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select(
    "email role firstName lastName emailVerified addresses favoriteCategoryIds"
  );
  return res.json({ user });
}

/* ===== Email verification ===== */
export async function requestEmailVerification(req: Request, res: Response) {
  if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.emailVerified) return res.status(204).send();

  const token = generateToken(32);
  user.verificationToken = token;
  user.verificationExpires = addMinutes(new Date(), 30);
  await user.save();

  const verifyUrl = `${process.env.APP_URL || "http://localhost:8080"}/api/v1/auth/verify-email?token=${token}`;
  await sendMail(user.email, "Verify your email", `<p>Verify your email by clicking <a href="${verifyUrl}">this link</a>. This link expires in 30 minutes.</p>`);
  // DEBUG: if ?debug=1 is present, also return the URL in response (dev only)
  if (String(req.query.debug) === "1") {
    return res.json({ message: "Verification email sent (debug)", verifyUrl });
  }
  return res.json({ message: "Verification email sent" });
}

export async function verifyEmail(req: Request, res: Response) {
  const token = String(req.query.token || "");
  const user = await User.findOne({ verificationToken: token, verificationExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: "Invalid or expired token" });
  user.emailVerified = true;
  user.verificationToken = null;
  user.verificationExpires = null;
  await user.save();
  return res.json({ message: "Email verified" });
}

/* ===== Password reset ===== */
export const requestPasswordResetSchema = z.object({
  body: z.object({ email: z.string().email() })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    newPassword: z.string().min(6)
  })
});

export async function requestPasswordReset(req: Request, res: Response) {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(200).json({ message: "If this email exists, a reset link was sent" }); // don't leak
  const token = generateToken(32);
  user.resetToken = token;
  user.resetExpires = addMinutes(new Date(), 30);
  await user.save();
  // FE origin for reset link. Prefer APP_WEB_URL; default to localhost:3000 (avoid backend host).
  const webUrl = process.env.APP_WEB_URL || "http://localhost:3000";
  const resetUrl = `${webUrl}/reset-password?token=${token}`;
  await sendMail(
    user.email,
    "Reset your password",
    `<p>Reset your password using <a href="${resetUrl}">this link</a>. This link expires in 30 minutes.</p>`
  );
  return res.json({ message: "If this email exists, a reset link was sent" });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body;
  const user = await User.findOne({ resetToken: token, resetExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: "Invalid or expired token" });
  user.passwordHash = await hashPassword(newPassword);
  user.resetToken = null;
  user.resetExpires = null;
  await user.save();
  return res.json({ message: "Password updated" });
}

// Appended hashed reset token flow
import crypto from "crypto";
import bcrypt from "bcryptjs";

const RESET_TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN || 30);
const APP_URL = process.env.APP_URL || "http://localhost:3000";

/** POST /api/v1/auth/request-password-reset (hash-based, always 200) */
export async function requestPasswordResetHashed(req: any, res: any) {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
  }
  const { email } = parsed.data;

  const user = await User.findOne({ email });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000);

    (user as any).passwordResetTokenHash = tokenHash;
    (user as any).passwordResetExpires = expires;
    await user.save();

    const resetUrl = `${APP_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    const html = `
      <h2>Reset your password</h2>
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here</a> to set a new password. This link expires in ${RESET_TTL_MIN} minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `;
    try { await sendMail(email, "Reset your password", html); } catch {}
  }

  return res.json({ message: "If an account exists for this email, a reset link has been sent." });
}

/** POST /api/v1/auth/reset-password (hash-based) */
export async function resetPasswordHashed(req: any, res: any) {
  const schema = z.object({
    token: z.string().min(10),
    newPassword: z.string().min(6)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
  }
  const { token, newPassword } = parsed.data;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() }
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  // Set new password and clear reset fields
  (user as any).passwordHash = await bcrypt.hash(newPassword, 10);
  (user as any).passwordResetTokenHash = undefined;
  (user as any).passwordResetExpires = undefined;
  await user.save();

  try {
    await sendMail(
      user.email,
      "Your password was changed",
      `<p>Your password has been updated successfully.</p>`
    );
  } catch {}

  return res.json({ message: "Password has been reset successfully" });
}