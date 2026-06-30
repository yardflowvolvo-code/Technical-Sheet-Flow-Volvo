import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetCompanyParams,
  UpdateCompanyParams,
  SuspendCompanyParams,
  ActivateCompanyParams,
  CreateCompanyBody,
  UpdateCompanyBody,
} from "@workspace/api-zod";
import { requireSuperadmin } from "../middlewares/auth";

const router = Router();

function companyToResponse(c: typeof companiesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    status: c.status,
    planMonthlyPrice: c.planMonthlyPrice,
    mercadoPagoSubscriptionId: c.mercadoPagoSubscriptionId ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/api/companies", requireSuperadmin, async (_req, res) => {
  const rows = await db.select().from(companiesTable).orderBy(companiesTable.createdAt);
  res.json(rows.map(companyToResponse));
});

router.post("/api/companies", requireSuperadmin, async (req, res) => {
  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, slug, planMonthlyPrice } = parsed.data;
  const [company] = await db
    .insert(companiesTable)
    .values({ name, slug, planMonthlyPrice: planMonthlyPrice ?? 299.0 })
    .returning();
  res.status(201).json(companyToResponse(company!));
});

router.get("/api/companies/:id", requireSuperadmin, async (req, res) => {
  const parsed = GetCompanyParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, parsed.data.id));
  if (!company) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(companyToResponse(company));
});

router.patch("/api/companies/:id", requireSuperadmin, async (req, res) => {
  const parsedParams = UpdateCompanyParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateCompanyBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [company] = await db
    .update(companiesTable)
    .set(parsedBody.data)
    .where(eq(companiesTable.id, parsedParams.data.id))
    .returning();
  if (!company) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(companyToResponse(company));
});

router.post("/api/companies/:id/suspend", requireSuperadmin, async (req, res) => {
  const parsed = SuspendCompanyParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [company] = await db
    .update(companiesTable)
    .set({ status: "suspended" })
    .where(eq(companiesTable.id, parsed.data.id))
    .returning();
  if (!company) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(companyToResponse(company));
});

router.post("/api/companies/:id/activate", requireSuperadmin, async (req, res) => {
  const parsed = ActivateCompanyParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [company] = await db
    .update(companiesTable)
    .set({ status: "active" })
    .where(eq(companiesTable.id, parsed.data.id))
    .returning();
  if (!company) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(companyToResponse(company));
});

export default router;
