import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { restRouter } from "../routers/rest";
import { createContext } from "./context";
import { ENV } from "./env";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Security-hardening middleware: standard HTTP security headers (CSP,
  // HSTS, no-sniff, frame-deny, etc.) and baseline abuse/brute-force
  // rate limiting. `app.set("trust proxy", ...)` is required for
  // express-rate-limit to key correctly on the real client IP when the
  // app sits behind a reverse proxy/load balancer.
  app.set("trust proxy", 1);
  app.use(
    helmet({
      // Disable the default CSP: it's safe to opt in explicitly per
      // deployment (the built client loads its own bundled assets), but a
      // strict default can break the Vite dev-mode HMR websocket.
      contentSecurityPolicy: ENV.isProduction
        ? {
            useDefaults: true,
            directives: {
              "default-src": ["'self'"],
              "img-src": ["'self'", "data:", "blob:"],
              "connect-src": ["'self'"],
              "script-src": ["'self'"],
              "style-src": ["'self'", "'unsafe-inline'"],
            },
          }
        : false,
    })
  );
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again later." },
  });
  app.use("/api/trpc", apiLimiter);
  app.use("/api/trpc/auth.login", authLimiter);
  app.use("/api/trpc/auth.register", authLimiter);
  app.use("/api/v1", apiLimiter);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Serve locally-stored uploads (evidence files, generated assets).
  app.use("/uploads", express.static(path.resolve(process.cwd(), ENV.uploadsDir)));
  // tRPC API (primary API used by the React client)
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Versioned REST API for external/institutional system integration
  // (BI dashboards, ERP/HR/DMS connectors, server-to-server polling).
  // See server/routers/rest.ts and openapi/v1.json for the spec.
  app.use("/api/v1", restRouter);
  app.get("/api/v1/openapi.json", (_req, res) => {
    res.sendFile(path.resolve(process.cwd(), "openapi/v1.json"));
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
