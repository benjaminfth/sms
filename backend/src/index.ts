import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = parseInt(process.env.PORT || "4000", 10);

const server = app.listen(PORT, () => {
  console.log(`🚀 Brightloop SMS API server listening on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
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
