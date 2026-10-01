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
import { langMiddleware } from "@/services/lang";

// When the client's production build sits alongside this repo (single
// combined deploy, e.g. on Render), serve it from the same origin — avoids
// CORS/cross-site-cookie complexity entirely for the common single-service
// deployment shape.
const clientDistPath = path.resolve(__dirname, "../../client/dist");
const hasClientBuild = fs.existsSync(path.join(clientDistPath, "index.html"));

export function createApp() {
  const app = express();
  // Express 5 defaults to the "simple" query parser; keep the qs-based one the API was built on.
  app.set("query parser", "extended");

  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "img-src": ["'self'", "data:", "blob:", "https:"],
          "connect-src": ["'self'", "https:", "blob:"],
          // Allow embedding only inside the sept.cloud subdomain that mirrors this app —
          // not left wide open to arbitrary third-party sites.
          "frame-ancestors": ["'self'", "https://sept.cloud", "https://sanad-hr.sept.cloud"],
        },
      },
      // X-Frame-Options can't express a specific allowed origin (only SAMEORIGIN/DENY),
      // so it's disabled in favor of the CSP frame-ancestors directive above.
      frameguard: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  // What PDFs and exports print in: the interface language the client sends.
  app.use(langMiddleware);
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

  // The Android app (android/, a Trusted Web Activity) opens this site full
  // screen only when the site vouches for the app's signing key here.
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.sanad.hr",
          sha256_cert_fingerprints: ["10:EE:A3:8A:1C:05:B0:45:38:C7:09:EB:B3:01:CC:38:04:69:DC:E5:2E:F3:64:22:AD:9B:BF:83:9C:A7:32:00"],
        },
      },
    ]);
  });

  if (hasClientBuild) {
    // Vite's build output in /assets has content hashes in its filenames, so a
    // changed file always gets a new URL — safe to cache for a year. index.html
    // must always be revalidated so visitors pick up new deploys.
    app.use(
      "/assets",
      express.static(path.join(clientDistPath, "assets"), { maxAge: "365d", immutable: true, fallthrough: false })
    );
    // The service worker and the app manifest are re-checked on every visit,
    // so installed copies pick up a new deploy.
    app.use(
      express.static(clientDistPath, {
        maxAge: "1d",
        index: false,
        setHeaders: (res, file) => {
          if (file.endsWith("sw.js") || file.endsWith(".webmanifest")) res.setHeader("Cache-Control", "no-cache");
          // The Android app: always the newest build, saved under its own name.
          if (file.endsWith(".apk")) {
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Content-Type", "application/vnd.android.package-archive");
            res.setHeader("Content-Disposition", 'attachment; filename="SanaD.apk"');
          }
          if (file.endsWith("android.json")) res.setHeader("Cache-Control", "no-cache");
        },
      })
    );
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
