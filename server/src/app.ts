import path from "path";
import fs from "fs";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { authRouter } from "./routes/auth";
import { linksRouter } from "./routes/links";
import { logger } from "./logger";
import { loadConfig } from "./config";

export interface AppOptions {
  staticDir?: string | null;
}

export function createApp(options: AppOptions = {}): express.Express {
  const config = loadConfig();
  const app = express();

  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy:
        config.NODE_ENV === "production"
          ? {
              // Extend Helmet's default CSP so admin-configured link icons
              // hosted on third-party HTTPS origins can render. Everything
              // else stays at Helmet's safe defaults.
              useDefaults: true,
              directives: {
                "img-src": ["'self'", "data:", "https:"],
              },
            }
          : false,
    }),
  );
  app.use(
    cors(
      config.NODE_ENV === "production" ? { origin: false } : { origin: true },
    ),
  );
  app.use(express.json({ limit: "100kb" }));
  if (config.NODE_ENV !== "test") {
    app.use(pinoHttp({ logger }));
  }

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/links", linksRouter);

  // Static frontend
  const staticDir =
    options.staticDir ??
    config.STATIC_DIR ??
    path.resolve(process.cwd(), "web");
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir, { maxAge: "1h", index: false }));
    app.get(/^(?!\/api\/).*/, (_req, res, next) => {
      const indexFile = path.join(staticDir, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        next();
      }
    });
  }

  // 404 for unmatched API routes
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "not found" });
  });

  // Centralized error handler (no stack leak)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err, path: req.path }, "unhandled error");
    res.status(500).json({ error: "internal server error" });
  });

  return app;
}
