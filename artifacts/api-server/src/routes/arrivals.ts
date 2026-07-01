import { Router } from "express";
import { db } from "@workspace/db";
import { arrivalsTable, pushSubscriptionsTable } from "@workspace/db";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import {
  CreateArrivalBody,
  UpdateArrivalBody,
  CallDockBody,
  LinkArrivalBody,
  GetArrivalParams,
  UpdateArrivalParams,
  CallDockParams,
  ConfirmArrivalAtDockParams,
  CheckoutArrivalParams,
  ReportGeofenceExitParams,
} from "@workspace/api-zod";
import { sendPushNotification } from "../lib/vapid";

const router = Router();

function arrivalToResponse(a: typeof arrivalsTable.$inferSelect, hasPush: boolean) {
  const now = new Date();
  let elapsedMinutes: number | null = null;
  if (a.inYardAt && !a.finishedAt) {
    elapsedMinutes = Math.floor((now.getTime() - a.inYardAt.getTime()) / 60000);
  }
  return {
    id: a.id,
    plate: a.plate,
    driverName: a.driverName,
    invoiceNumber: a.invoiceNumber ?? null,
    status: a.status,
    dockNumber: a.dockNumber ?? null,
    lastLat: a.lastLat ?? null,
    lastLng: a.lastLng ?? null,
    lastLocationAt: a.lastLocationAt?.toISOString() ?? null,
    inYardAt: a.inYardAt?.toISOString() ?? null,
    calledAt: a.calledAt?.toISOString() ?? null,
    finishedAt: a.finishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    elapsedMinutes,
    hasPushSubscription: hasPush,
  };
}

async function withPushFlag(arrivals: (typeof arrivalsTable.$inferSelect)[]) {
  if (arrivals.length === 0) return arrivals.map((a) => arrivalToResponse(a, false));
  const ids = arrivals.map((a) => a.id);
  const subs = await db
    .selectDistinct({ arrivalId: pushSubscriptionsTable.arrivalId })
    .from(pushSubscriptionsTable)
    .where(inArray(pushSubscriptionsTable.arrivalId, ids));
  const subSet = new Set(subs.map((s) => s.arrivalId));
  return arrivals.map((a) => arrivalToResponse(a, subSet.has(a.id)));
}

router.get("/arrivals", async (req, res) => {
  const { status, active } = req.query;
  const conditions = [];

  if (status && typeof status === "string") {
    conditions.push(
      eq(
        arrivalsTable.status,
        status as typeof arrivalsTable.$inferSelect["status"]
      )
    );
  }

  if (active === "true") {
    conditions.push(isNull(arrivalsTable.finishedAt));
  } else if (active === "false") {
    conditions.push(sql`${arrivalsTable.finishedAt} IS NOT NULL`);
  }

  const rows =
    conditions.length > 0
      ? await db
          .select()
          .from(arrivalsTable)
          .where(and(...conditions))
          .orderBy(sql`${arrivalsTable.createdAt} DESC`)
      : await db
          .select()
          .from(arrivalsTable)
          .orderBy(sql`${arrivalsTable.createdAt} DESC`);

  const result = await withPushFlag(rows);
  res.json(result);
});

router.post("/arrivals", async (req, res) => {
  const parsed = CreateArrivalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { plate, driverName, invoiceNumber } = parsed.data;
  const [arrival] = await db
    .insert(arrivalsTable)
    .values({ plate: plate.toUpperCase(), driverName, invoiceNumber, status: "waiting" })
    .returning();
  res.status(201).json(arrivalToResponse(arrival!, false));
});

router.get("/arrivals/link", (req, res) => {
  res.status(405).json({ error: "Use POST" });
});

router.post("/arrivals/link", async (req, res) => {
  const parsed = LinkArrivalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { plate, invoiceNumber } = parsed.data;
  const conditions = [isNull(arrivalsTable.finishedAt)];
  if (plate) conditions.push(eq(arrivalsTable.plate, plate.toUpperCase()));
  if (invoiceNumber) conditions.push(eq(arrivalsTable.invoiceNumber, invoiceNumber));

  if (!plate && !invoiceNumber) {
    res.status(400).json({ error: "plate or invoiceNumber required" });
    return;
  }

  const [arrival] = await db
    .select()
    .from(arrivalsTable)
    .where(and(...conditions))
    .limit(1);

  if (!arrival) {
    res.status(404).json({ error: "No active arrival found" });
    return;
  }

  // Mark as in_yard if still waiting
  if (arrival.status === "waiting") {
    const [updated] = await db
      .update(arrivalsTable)
      .set({ status: "in_yard", inYardAt: new Date() })
      .where(eq(arrivalsTable.id, arrival.id))
      .returning();
    const result = await withPushFlag([updated!]);
    res.json(result[0]);
    return;
  }

  const result = await withPushFlag([arrival]);
  res.json(result[0]);
});

router.get("/arrivals/:id", async (req, res) => {
  const parsed = GetArrivalParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [arrival] = await db
    .select()
    .from(arrivalsTable)
    .where(eq(arrivalsTable.id, parsed.data.id));
  if (!arrival) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const result = await withPushFlag([arrival]);
  res.json(result[0]);
});

router.patch("/arrivals/:id", async (req, res) => {
  const parsedParams = UpdateArrivalParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = UpdateArrivalBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [arrival] = await db
    .update(arrivalsTable)
    .set(parsedBody.data)
    .where(eq(arrivalsTable.id, parsedParams.data.id))
    .returning();
  if (!arrival) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const result = await withPushFlag([arrival]);
  res.json(result[0]);
});

router.post("/arrivals/:id/call-dock", async (req, res) => {
  const parsedParams = CallDockParams.safeParse({ id: Number(req.params.id) });
  const parsedBody = CallDockBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { id } = parsedParams.data;
  const { dockNumber } = parsedBody.data;

  const [arrival] = await db
    .update(arrivalsTable)
    .set({ status: "called", dockNumber, calledAt: new Date() })
    .where(eq(arrivalsTable.id, id))
    .returning();
  if (!arrival) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Send push notifications
  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.arrivalId, id));

  for (const sub of subs) {
    try {
      await sendPushNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
        {
          title: "Yardflow — Chamado para a Doca!",
          body: `Dirija-se à Doca ${dockNumber}. Placa: ${arrival.plate}`,
          dockNumber,
          arrivalId: id,
        }
      );
    } catch (_) {
      // ignore individual push failures
    }
  }

  const result = await withPushFlag([arrival]);
  res.json(result[0]);
});

router.post("/arrivals/:id/confirm-arrival-dock", async (req, res) => {
  const parsed = ConfirmArrivalAtDockParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [arrival] = await db
    .select()
    .from(arrivalsTable)
    .where(eq(arrivalsTable.id, parsed.data.id));
  if (!arrival) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const result = await withPushFlag([arrival]);
  res.json(result[0]);
});

router.post("/arrivals/:id/checkout", async (req, res) => {
  const parsed = CheckoutArrivalParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [arrival] = await db
    .update(arrivalsTable)
    .set({ status: "finished", finishedAt: new Date() })
    .where(eq(arrivalsTable.id, parsed.data.id))
    .returning();
  if (!arrival) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const result = await withPushFlag([arrival]);
  res.json(result[0]);
});

router.post("/arrivals/:id/geofence-exit", async (req, res) => {
  const parsed = ReportGeofenceExitParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [arrival] = await db
    .update(arrivalsTable)
    .set({ status: "possible_exit" })
    .where(
      and(
        eq(arrivalsTable.id, parsed.data.id),
        isNull(arrivalsTable.finishedAt)
      )
    )
    .returning();
  if (!arrival) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const result = await withPushFlag([arrival]);
  res.json(result[0]);
});

export default router;
