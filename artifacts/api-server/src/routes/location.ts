import { Router } from "express";
import { db } from "@workspace/db";
import { arrivalsTable, configTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateLocationParams, UpdateLocationBody } from "@workspace/api-zod";
import { haversineDistance } from "../lib/haversine";
const router = Router();
router.post("/arrivals/:id/location", async (req, res) => {
  const parsedParams = UpdateLocationParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateLocationBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { id } = parsedParams.data;
  const { lat, lng } = parsedBody.data;
  const [arrival] = await db
    .select()
    .from(arrivalsTable)
    .where(eq(arrivalsTable.id, id));
  if (!arrival) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  // Fetch geofence config for this arrival's own company
  const [config] = arrival.companyId
    ? await db
        .select()
        .from(configTable)
        .where(eq(configTable.companyId, arrival.companyId))
        .limit(1)
    : [];
  const centerLat = config?.geofenceLat ?? -25.453996734949122;
  const centerLng = config?.geofenceLng ?? -49.362939914073124;
  const radius = config?.geofenceRadiusMeters ?? 1200;
  const distanceMeters = haversineDistance(lat, lng, centerLat, centerLng);
  const isInGeofence = distanceMeters <= radius;
  // Update location
  const updateFields: Partial<typeof arrivalsTable.$inferInsert> = {
    lastLat: lat,
    lastLng: lng,
    lastLocationAt: new Date(),
  };
  // Transition: waiting → in_yard when enters geofence
  if (isInGeofence && arrival.status === "waiting") {
    updateFields.status = "in_yard";
    updateFields.inYardAt = new Date();
  }
  // Transition: in_yard → possible_exit when leaves geofence
  if (!isInGeofence && (arrival.status === "in_yard" || arrival.status === "called")) {
    updateFields.status = "possible_exit";
  }
  await db
    .update(arrivalsTable)
    .set(updateFields)
    .where(eq(arrivalsTable.id, id));
  const updatedArr = await db
    .select()
    .from(arrivalsTable)
    .where(eq(arrivalsTable.id, id));
  res.json({
    status: updatedArr[0]?.status ?? arrival.status,
    isInGeofence,
    distanceMeters: Math.round(distanceMeters),
  });
});
export default router;
