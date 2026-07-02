import { Router } from "express";
import { randomBytes } from "node:crypto";
import { clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import {
  companyUsersTable,
  superadminsTable,
  companiesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateCompanyUserBody,
  UpdateCompanyUserParams,
  UpdateCompanyUserBody,
  DeleteCompanyUserParams,
} from "@workspace/api-zod";
import { requireAuth, requireCompany, requireRole } from "../middlewares/auth";
const router = Router();

// Generates a random password that satisfies Clerk's default password
// policy (8+ chars, mixed case, digit, symbol) without being awkward to
// read aloud/type when an admin shares it with an employee.
function generateTemporaryPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const symbols = "!@#$%";
  const bytes = randomBytes(10);
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += alphabet[bytes[i]! % alphabet.length];
  }
  password += symbols[bytes[0]! % symbols.length];
  return password;
}

function userToResponse(u: typeof companyUsersTable.$inferSelect) {
  return {
    id: u.id,
    companyId: u.companyId,
    clerkUserId: u.clerkUserId,
    role: u.role,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
  };
}
router.get("/me", requireAuth, async (req, res) => {
  const clerkUserId = req.clerkUserId!;
  const [superadmin] = await db
    .select()
    .from(superadminsTable)
    .where(eq(superadminsTable.clerkUserId, clerkUserId))
    .limit(1);
  const [companyUser] = await db
    .select()
    .from(companyUsersTable)
    .where(eq(companyUsersTable.clerkUserId, clerkUserId))
    .limit(1);
  let company = null;
  if (companyUser) {
    const [c] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, companyUser.companyId))
      .limit(1);
    if (c) {
      company = {
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        planMonthlyPrice: c.planMonthlyPrice,
        mercadoPagoSubscriptionId: c.mercadoPagoSubscriptionId ?? null,
        createdAt: c.createdAt.toISOString(),
      };
    }
  }
  res.json({
    clerkUserId,
    isSuperadmin: !!superadmin,
    companyUser: companyUser ? userToResponse(companyUser) : undefined,
    company: company ?? undefined,
  });
});
router.get(
  "/company-users",
  requireCompany,
  requireRole("gestor"),
  async (req, res) => {
    const rows = await db
      .select()
      .from(companyUsersTable)
      .where(eq(companyUsersTable.companyId, req.companyId!))
      .orderBy(companyUsersTable.createdAt);
    res.json(rows.map(userToResponse));
  }
);
router.post(
  "/company-users",
  requireCompany,
  requireRole("gestor"),
  async (req, res) => {
    const parsed = CreateCompanyUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { name, email, role } = parsed.data;
    const temporaryPassword = generateTemporaryPassword();
    const [firstName, ...rest] = name.trim().split(/\s+/);
    const lastName = rest.join(" ") || undefined;

    let clerkUserId: string;
    try {
      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [email],
        password: temporaryPassword,
        firstName,
        lastName,
      });
      clerkUserId = clerkUser.id;
    } catch (err: any) {
      const clerkMessage =
        err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message;
      if (
        err?.status === 422 ||
        clerkMessage?.toLowerCase().includes("taken") ||
        clerkMessage?.toLowerCase().includes("exists")
      ) {
        res
          .status(409)
          .json({ error: clerkMessage ?? "Este e-mail já está em uso." });
        return;
      }
      res
        .status(400)
        .json({ error: clerkMessage ?? "Não foi possível criar o login." });
      return;
    }

    try {
      const [user] = await db
        .insert(companyUsersTable)
        .values({ name, email, role, clerkUserId, companyId: req.companyId! })
        .returning();
      res.status(201).json({ ...userToResponse(user!), temporaryPassword });
    } catch (err) {
      // Roll back the Clerk account so we don't leave an orphaned login
      // with no company membership behind.
      await clerkClient.users.deleteUser(clerkUserId).catch(() => {});
      throw err;
    }
  }
);
router.patch(
  "/company-users/:id",
  requireCompany,
  requireRole("gestor"),
  async (req, res) => {
    const parsedParams = UpdateCompanyUserParams.safeParse({ id: Number(req.params.id) });
    const parsedBody = UpdateCompanyUserBody.safeParse(req.body);
    if (!parsedParams.success || !parsedBody.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [user] = await db
      .update(companyUsersTable)
      .set(parsedBody.data)
      .where(eq(companyUsersTable.id, parsedParams.data.id))
      .returning();
    if (!user || user.companyId !== req.companyId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(userToResponse(user));
  }
);
router.delete(
  "/company-users/:id",
  requireCompany,
  requireRole("gestor"),
  async (req, res) => {
    const parsed = DeleteCompanyUserParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [deleted] = await db
      .delete(companyUsersTable)
      .where(eq(companyUsersTable.id, parsed.data.id))
      .returning();
    if (!deleted || deleted.companyId !== req.companyId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    // Best-effort: also revoke the Clerk login so the removed employee
    // can't still sign in (they'd otherwise just hit 403s everywhere).
    await clerkClient.users.deleteUser(deleted.clerkUserId).catch(() => {});
    res.json({ success: true });
  }
);
export default router;
