import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";
import { logger } from "./lib/logger";
import { initVapid } from "./lib/vapid";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";

// This file is bundled to artifacts/api-server/dist/index.mjs, so the repo
// root is three levels up (dist -> api-server -> artifacts -> root).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

const adminDist = path.join(repoRoot, "artifacts/admin/dist/public");
const driverDist = path.join(repoRoot, "artifacts/driver-pwa/dist/public");
const superadminDist = path.join(
  repoRoot,
  "artifacts/superadmin/dist/public",
);

initVapid();

const app: Express = express();

// Render sits behind a reverse proxy — without this, express-rate-limit
// (and anything else relying on req.ip) sees every request as coming from
// the same proxy IP.
app.set("trust proxy", 1);

// Clerk proxy — must come before express.json()
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Everything the browser needs (admin/driver/superadmin) is served from
// this same origin, so CORS isn't needed for the app itself — same-origin
// requests are never subject to CORS in the first place. This just closes
// the door on other websites making cross-origin browser requests to the
// API. Requests with no Origin header (server-to-server calls, webhooks,
// health checks) are always allowed, since CORS is a browser-only concept.
const allowedOrigins = [process.env["PUBLIC_APP_URL"], process.env["RENDER_EXTERNAL_URL"]]
  .filter((url): url is string => !!url)
  .map((url) => url.replace(/\/$/, ""));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// General limit for the whole API — generous, since dashboards poll
// several endpoints every 8-30s across multiple open tabs.
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Tighter limit specifically for the driver's unauthenticated "link by
// plate/invoice" endpoint — the one most exposed to guessing/brute-force
// attempts, since it has no login in front of it by design.
app.use(
  "/api/arrivals/link",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
  }),
);

// Clerk auth middleware — validates session tokens
app.use(clerkMiddleware());

app.use(router);

// Any /api/* request that fell through the router above is a genuine 404 —
// return JSON instead of letting it fall into the HTML fallback below.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// --- Static frontends (built by `pnpm --filter <app> run build`) ---
// Served from the same origin as the API so Clerk session cookies and
// relative `/api/...` fetch calls just work, with no CORS/token wiring
// needed. Order matters: more specific paths first, admin last as the
// catch-all default app.

app.use("/driver", express.static(driverDist));
app.get(/^\/driver(\/.*)?$/, (_req, res) => {
  res.sendFile(path.join(driverDist, "index.html"));
});

app.use("/superadmin", express.static(superadminDist));
app.get(/^\/superadmin(\/.*)?$/, (_req, res) => {
  res.sendFile(path.join(superadminDist, "index.html"));
});

app.use(express.static(adminDist));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(adminDist, "index.html"));
});

export default app;
