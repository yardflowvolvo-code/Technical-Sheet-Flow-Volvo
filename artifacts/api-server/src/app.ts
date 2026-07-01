import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
