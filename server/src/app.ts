import path from "path";
import fs from "fs";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";
import { ApiError } from "@/utils/apiError";
import routes from "@/routes";

// When the client's production build sits alongside this repo (single
// combined deploy, e.g. on Render), serve it from the same origin — avoids
// CORS/cross-site-cookie complexity entirely for the common single-service
// deployment shape.
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const hasClientBuild = fs.existsSync(path.join(clientDistPath, "index.html"));

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/api/health" } }));

  // General API rate limit — auth-specific routes apply a tighter limit of
  // their own on top of this (§43).
  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res, next) => next(ApiError.tooMany("Too many requests. Please slow down and try again shortly.")),
    })
  );

  app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

  app.use("/api", routes);

  if (hasClientBuild) {
    app.use(express.static(clientDistPath));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDistPath, "index.html")));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
