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
import { companiesTable } from "./companies";

export const arrivalStatusEnum = pgEnum("arrival_status", [
  "waiting",
  "in_yard",
  "called",
  "possible_exit",
  "finished",
]);

export const arrivalsTable = pgTable("arrivals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id, {
    onDelete: "cascade",
  }),
  // Opaque, non-guessable identifier used by the unauthenticated driver PWA
  // (status lookup, GPS reporting) instead of the sequential numeric id —
  // the numeric id is only ever used internally by authenticated staff.
  publicToken: text("public_token").unique(),
  plate: text("plate").notNull(),
  driverName: text("driver_name").notNull(),
  invoiceNumber: text("invoice_number"),
  status: arrivalStatusEnum("status").notNull().default("waiting"),
  dockNumber: integer("dock_number"),
  lastLat: real("last_lat"),
  lastLng: real("last_lng"),
  lastLocationAt: timestamp("last_location_at"),
  inYardAt: timestamp("in_yard_at"),
  calledAt: timestamp("called_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertArrivalSchema = createInsertSchema(arrivalsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertArrival = z.infer<typeof insertArrivalSchema>;
export type Arrival = typeof arrivalsTable.$inferSelect;

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  arrivalId: integer("arrival_id")
    .notNull()
    .references(() => arrivalsTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  auth: text("auth").notNull(),
  p256dh: text("p256dh").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;

export const configTable = pgTable("config", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id, {
    onDelete: "cascade",
  }),
  geofenceLat: real("geofence_lat").notNull().default(-25.453996734949122),
  geofenceLng: real("geofence_lng").notNull().default(-49.362939914073124),
  geofenceRadiusMeters: integer("geofence_radius_meters")
    .notNull()
    .default(1200),
  locationIntervalSeconds: integer("location_interval_seconds")
    .notNull()
    .default(20),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Config = typeof configTable.$inferSelect;
