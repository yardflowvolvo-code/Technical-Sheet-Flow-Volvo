import { Router } from "express";
import { db } from "@workspace/db";
import { configTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateConfigBody } from "@workspace/api-zod";

const router = Router();

async function ensureConfig() {
  const [existing] = await db.select().from(configTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(configTable).values({}).returning();
  return created!;
}

router.get("/api/config", async (_req, res) => {
  const config = await ensureConfig();
  res.json({
    geofenceLat: config.geofenceLat,
    geofenceLng: config.geofenceLng,
    geofenceRadiusMeters: config.geofenceRadiusMeters,
    locationIntervalSeconds: config.locationIntervalSeconds,
  });
});

router.patch("/api/config", async (req, res) => {
  const parsed = UpdateConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const config = await ensureConfig();
  const [updated] = await db
    .update(configTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(configTable.id, config.id))
    .returning();
  res.json({
    geofenceLat: updated!.geofenceLat,
    geofenceLng: updated!.geofenceLng,
    geofenceRadiusMeters: updated!.geofenceRadiusMeters,
    locationIntervalSeconds: updated!.locationIntervalSeconds,
  });
});

export default router;
