import type { RequestHandler } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { companyUsersTable, superadminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      companyId?: number;
      clerkUserId?: string;
      companyRole?: "gestor" | "portaria" | "doca";
      isSuperadmin?: boolean;
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = userId;
  next();
};

export const requireSuperadmin: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = userId;

  const [superadmin] = await db
    .select()
    .from(superadminsTable)
    .where(eq(superadminsTable.clerkUserId, userId))
    .limit(1);

  if (!superadmin) {
    res.status(403).json({ error: "Forbidden — superadmin only" });
    return;
  }
  req.isSuperadmin = true;
  next();
};

export const requireCompany: RequestHandler = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = userId;

  const [companyUser] = await db
    .select()
    .from(companyUsersTable)
    .where(eq(companyUsersTable.clerkUserId, userId))
    .limit(1);

  if (!companyUser) {
    res.status(403).json({ error: "Forbidden — no company membership" });
    return;
  }
  req.companyId = companyUser.companyId;
  req.companyRole = companyUser.role;
  next();
};

export function requireRole(...roles: Array<"gestor" | "portaria" | "doca">): RequestHandler {
  return (req, res, next) => {
    if (!req.companyRole || !roles.includes(req.companyRole)) {
      res.status(403).json({ error: `Forbidden — requires role: ${roles.join(" or ")}` });
      return;
    }
    next();
  };
}
