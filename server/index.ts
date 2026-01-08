import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logger, errorLogger } from "./logger";
import sessionConfig from "./session";
import DeviceBridgeWebSocket from "./websocket";
import { updateRollingDataWindow } from "./rolling-data";

const app = express();

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

// Trust proxy - needed for rate limiting to work correctly in development/production
// This allows Express to trust the X-Forwarded-* headers
app.set('trust proxy', true);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware - must be before routes
app.use(session(sessionConfig));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize app (for both Vercel and standalone)
async function initializeApp() {
  // Auto-update demo patient data to keep dates current
  await updateRollingDataWindow();

  await registerRoutes(app);

  // Error logging middleware
  app.use(errorLogger);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  });

  // Serve static files in production
  if (!isVercel && app.get("env") !== "development") {
    serveStatic(app);
  }

  return app;
}

// For Vercel: export the app
let appPromise: Promise<express.Express> | null = null;
export async function getApp() {
  if (!appPromise) {
    appPromise = initializeApp();
  }
  return appPromise;
}

// Export for Vercel serverless
export default app;

// Standalone server mode (not Vercel)
if (!isVercel) {
  (async () => {
    await initializeApp();

    const http = await import('http');
    const server = http.createServer(app);

    // Initialize WebSocket server for real-time device communication
    const wsServer = new DeviceBridgeWebSocket(server);
    logger.info('WebSocket server ready for device and provider connections');

    // Make WebSocket server accessible to routes if needed
    (app as any).wsServer = wsServer;

    // Setup Vite in development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    }

    // ALWAYS serve the app on port 5000
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      logger.info(`Bedside Bike API server started on port ${port}`, {
        port,
        environment: process.env.NODE_ENV || 'development',
        database: process.env.USE_LOCAL_DB === 'true' ? 'SQLite' : 'Azure SQL'
      });
    });
  })();
}
