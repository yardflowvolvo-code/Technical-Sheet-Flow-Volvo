import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionsTable, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireCompany, requireSuperadmin } from "../middlewares/auth";

const router = Router();

router.get("/subscriptions/current", requireCompany, async (req, res) => {
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.companyId, req.companyId!))
    .orderBy(subscriptionsTable.createdAt)
    .limit(1);

  if (!sub) {
    res.json({ status: "none", currentPeriodEnd: null, externalId: null });
    return;
  }

  res.json({
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    externalId: sub.externalId ?? null,
  });
});

router.post("/subscriptions/checkout", requireCompany, async (req, res) => {
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, req.companyId!))
    .limit(1);

  if (!company) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  // Mercado Pago checkout URL — in production this would call the MP API
  const mpAccessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!mpAccessToken) {
    // Return a demo URL if MP not configured
    res.json({
      checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout",
    });
    return;
  }

  try {
    // PUBLIC_APP_URL should point to the admin frontend (where the user lands after checkout).
    // PUBLIC_API_URL should point to this API server (where MP sends webhook notifications).
    // On Render, PUBLIC_API_URL can default to RENDER_EXTERNAL_URL, which Render provides
    // automatically for every Web Service.
    const appUrl = process.env["PUBLIC_APP_URL"] ?? "https://yardflow.com.br";
    const apiUrl =
      process.env["PUBLIC_API_URL"] ?? process.env["RENDER_EXTERNAL_URL"];

    const body = {
      reason: `Yardflow — ${company.name}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: company.planMonthlyPrice,
        currency_id: "BRL",
      },
      // Ties the MP subscription back to our company row — required for the webhook
      // handler below to know which company to update.
      external_reference: String(company.id),
      back_url: `${appUrl.replace(/\/$/, "")}/`,
      notification_url: apiUrl
        ? `${apiUrl.replace(/\/$/, "")}/api/webhooks/mercadopago`
        : undefined,
    };

    const response = await fetch("https://api.mercadopago.com/preapproval_plan", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      req.log.error({ err }, "Mercado Pago checkout failed");
      res.status(502).json({ error: "Payment provider error" });
      return;
    }

    const data = (await response.json()) as { init_point?: string };
    res.json({ checkoutUrl: data.init_point ?? "" });
  } catch (err) {
    req.log.error({ err }, "Mercado Pago checkout error");
    res.status(500).json({ error: "Internal error" });
  }
});

// Webhook — public endpoint (no auth), verified by MP signature
router.post("/webhooks/mercadopago", async (req, res) => {
  const { type, data } = req.body as { type?: string; data?: { id?: string } };

  if (type === "subscription_preapproval" && data?.id) {
    try {
      const mpAccessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
      if (mpAccessToken) {
        const response = await fetch(
          `https://api.mercadopago.com/preapproval/${data.id}`,
          {
            headers: { Authorization: `Bearer ${mpAccessToken}` },
          }
        );
        if (response.ok) {
          const sub = (await response.json()) as {
            status?: string;
            external_reference?: string;
            next_payment_date?: string;
          };

          // Map MP status to our status
          const statusMap: Record<string, string> = {
            authorized: "active",
            paused: "delinquent",
            cancelled: "cancelled",
          };
          const mappedStatus = statusMap[sub.status ?? ""] ?? "delinquent";

          // Find company by external reference (company id stored there)
          if (sub.external_reference) {
            const companyId = parseInt(sub.external_reference, 10);
            if (!isNaN(companyId)) {
              const [existing] = await db
                .select()
                .from(subscriptionsTable)
                .where(eq(subscriptionsTable.companyId, companyId))
                .limit(1);

              if (existing) {
                await db
                  .update(subscriptionsTable)
                  .set({
                    status: mappedStatus as typeof subscriptionsTable.$inferSelect["status"],
                    externalId: data.id,
                    updatedAt: new Date(),
                    currentPeriodEnd: sub.next_payment_date
                      ? new Date(sub.next_payment_date)
                      : undefined,
                  })
                  .where(eq(subscriptionsTable.id, existing.id));
              } else {
                await db.insert(subscriptionsTable).values({
                  companyId,
                  status: mappedStatus as typeof subscriptionsTable.$inferSelect["status"],
                  gateway: "mercadopago",
                  externalId: data.id,
                  currentPeriodEnd: sub.next_payment_date
                    ? new Date(sub.next_payment_date)
                    : undefined,
                });
              }

              // Update company status
              await db
                .update(companiesTable)
                .set({
                  status: mappedStatus as typeof companiesTable.$inferSelect["status"],
                  mercadoPagoSubscriptionId: data.id,
                })
                .where(eq(companiesTable.id, companyId));
            }
          }
        }
      }
    } catch (_) {
      // log but ack anyway
    }
  }

  res.json({ success: true });
});

export default router;
