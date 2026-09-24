// Express factory (exported, no listen) — see src/index.js for the entry point.
import express from "express";
import productsRouter from "./routes/products.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createMcpRouter } from "./mcp.js";

export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use("/products", productsRouter);

  // MCP endpoint — add this line
  app.use("/mcp", createMcpRouter());
  app.use((req, res) => {
    res
      .status(404)
      .json({ success: false, data: null, error: "Route not found" });
  });

  app.use(errorHandler);

  return app;
};
