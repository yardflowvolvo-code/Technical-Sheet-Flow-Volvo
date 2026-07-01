import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable, arrivalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SubscribePushParams, SubscribePushBody } from "@workspace/api-zod";
import { getVapidPublicKey } from "../lib/vapid";
const router = Router();
router.get("/push/vapid-key", (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});
router.post("/arrivals/:id/push-subscribe", async (req, res) => {
  const parsedParams = SubscribePushParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = SubscribePushBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { id } = parsedParams.data;
  const { endpoint, keys } = parsedBody.data;
  const [arrival] = await db
    .select()
    .from(arrivalsTable)
    .where(eq(arrivalsTable.id, id));
  if (!arrival) {
    res.status(404).json({ error: "Arrival not found" });
    return;
  }
  // Upsert subscription (delete old ones for same endpoint, then insert)
  await db
    .delete(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.endpoint, endpoint));
  await db.insert(pushSubscriptionsTable).values({
    arrivalId: id,
    endpoint,
    auth: keys.auth,
    p256dh: keys.p256dh,
  });
  res.json({ success: true });
});
export default router;
