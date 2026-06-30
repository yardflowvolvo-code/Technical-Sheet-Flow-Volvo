import { Router } from "express";
import { db } from "@workspace/db";
import { arrivalsTable } from "@workspace/db";
import { and, gte, lte, sql } from "drizzle-orm";
import { GetReportsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/api/reports", async (req, res) => {
  const parsed = GetReportsQueryParams.safeParse({
    from: req.query.from,
    to: req.query.to,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { from, to, page = 1, limit = 50 } = parsed.data;
  const conditions = [];

  if (from) {
    conditions.push(gte(arrivalsTable.createdAt, new Date(from)));
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(arrivalsTable.createdAt, toDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(arrivalsTable)
    .where(whereClause);

  const total = countResult?.count ?? 0;
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(arrivalsTable)
    .where(whereClause)
    .orderBy(sql`${arrivalsTable.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  const data = rows.map((r) => {
    let durationMinutes: number | null = null;
    if (r.inYardAt && r.finishedAt) {
      durationMinutes = Math.round(
        (r.finishedAt.getTime() - r.inYardAt.getTime()) / 60000
      );
    }
    return {
      id: r.id,
      plate: r.plate,
      driverName: r.driverName,
      invoiceNumber: r.invoiceNumber ?? null,
      status: r.status,
      dockNumber: r.dockNumber ?? null,
      createdAt: r.createdAt.toISOString(),
      inYardAt: r.inYardAt?.toISOString() ?? null,
      finishedAt: r.finishedAt?.toISOString() ?? null,
      durationMinutes,
    };
  });

  res.json({ data, total, page, limit });
});

export default router;
