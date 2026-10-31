import path from "path";
import dotenv from "dotenv";

// Ensure root .env is loaded in monorepo environment
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import app from "./app";

const PORT = parseInt(process.env.PORT || "4000", 10);

const server = app.listen(PORT, () => {
  console.log(`🚀 Brightloop SMS API server listening on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📧 Email Provider: ${process.env.EMAIL_PROVIDER || "logger"}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    process.exit(0);
  });
});
