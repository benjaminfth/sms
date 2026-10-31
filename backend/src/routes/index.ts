import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import customerRoutes from "./customer.routes";
import productRoutes from "./product.routes";
import planRoutes from "./plan.routes";
import { AppResponse } from "../utils/response";

const router = Router();

router.get("/health", (_req, res) => {
  return AppResponse.success(res, {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "brightloop-sms-api",
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/customers", customerRoutes);
router.use("/products", productRoutes);
router.use("/plans", planRoutes);

export default router;
