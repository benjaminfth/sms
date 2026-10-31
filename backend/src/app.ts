import path from "path";
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./routes";
import { errorHandler } from "./middleware/error-handler";
import { apiLimiter } from "./middleware/rate-limit";
import { NotFoundError } from "./utils/errors";

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiter
app.use(apiLimiter);

// API v1 routes
app.use("/api/v1", routes);

// 404 handler for undefined routes
app.use((req, _res, next) => {
  next(new NotFoundError(`Endpoint ${req.method} ${req.originalUrl} not found`));
});

// Centralized error handler
app.use(errorHandler);

export default app;
