import { Router } from "express";
import { db } from "@workspace/db";
import { arrivalsTable } from "@workspace/db";
import { isNull, sql } from "drizzle-orm";
import { requireCompany, requireRole } from "../middlewares/auth";
const router = Router();
router.get(
  "/stats",
  requireCompany,
  requireRole("doca", "gestor"),
  async (_req, res) => {
  const rows = await db
    .select()
    .from(arrivalsTable)
    .where(isNull(arrivalsTable.finishedAt));
  let totalInYard = 0;
  let totalCalled = 0;
  let totalWaiting = 0;
  let totalElapsed = 0;
  let countWithTime = 0;
  const now = new Date();
  for (const r of rows) {
    if (r.status === "waiting") totalWaiting++;
    else if (r.status === "called") totalCalled++;
    else if (r.status === "in_yard" || r.status === "possible_exit") totalInYard++;
    if (r.inYardAt) {
      totalElapsed += (now.getTime() - r.inYardAt.getTime()) / 60000;
      countWithTime++;
    }
  }
  res.json({
    totalInYard,
    totalCalled,
    totalWaiting,
    avgWaitMinutes: countWithTime > 0 ? Math.round(totalElapsed / countWithTime) : null,
  });
});
export default router;
