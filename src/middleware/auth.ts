import { requireAuth, requireAdmin } from "../middlewares/auth.middleware";

export const authMiddleware = requireAuth;
export const adminMiddleware = requireAdmin;