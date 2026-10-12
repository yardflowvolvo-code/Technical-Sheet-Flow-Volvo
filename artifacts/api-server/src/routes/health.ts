import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Verifica só se o servidor Express está de pé (não toca no banco).
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Verifica se o Postgres (Supabase) responde. Usado pelo UptimeRobot:
// cada ping executa uma consulta real, o que conta como atividade no banco
// e impede a pausa automática do plano gratuito. Se o banco estiver fora,
// responde 503 para o monitor disparar o alerta.
router.get("/healthz/db", async (_req, res) => {
  const inicio = Date.now();
  try {
    await db.execute(sql`select 1`);
    res.json({ status: "ok", db: "ok", ms: Date.now() - inicio });
  } catch (err) {
    console.error("[healthz/db] falha ao consultar o banco:", err);
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});

export default router;
