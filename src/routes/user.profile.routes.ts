import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { listMyAddresses, addMyAddress, removeMyAddress } from "../controllers/user.profile.controller";

const router = Router();
router.use(requireAuth);

router.get("/me/addresses", listMyAddresses);
router.post("/me/addresses", addMyAddress);
router.delete("/me/addresses/:id", removeMyAddress);

export default router;

