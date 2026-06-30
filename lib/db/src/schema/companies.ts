import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companyStatusEnum = pgEnum("company_status", [
  "active",
  "delinquent",
  "suspended",
  "cancelled",
]);

export const userRoleEnum = pgEnum("user_role", [
  "gestor",
  "portaria",
  "doca",
]);

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: companyStatusEnum("status").notNull().default("active"),
  planMonthlyPrice: real("plan_monthly_price").notNull().default(299.0),
  mercadoPagoSubscriptionId: text("mercado_pago_subscription_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Company = typeof companiesTable.$inferSelect;
export const insertCompanySchema = createInsertSchema(companiesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export const companyUsersTable = pgTable("company_users", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  role: userRoleEnum("role").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CompanyUser = typeof companyUsersTable.$inferSelect;
export const insertCompanyUserSchema = createInsertSchema(companyUsersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCompanyUser = z.infer<typeof insertCompanyUserSchema>;

export const superadminsTable = pgTable("superadmins", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Superadmin = typeof superadminsTable.$inferSelect;

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  status: companyStatusEnum("status").notNull().default("active"),
  gateway: text("gateway").notNull().default("mercadopago"),
  externalId: text("external_id"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Subscription = typeof subscriptionsTable.$inferSelect;
