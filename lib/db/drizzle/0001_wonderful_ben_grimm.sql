ALTER TABLE "arrivals" ADD COLUMN "public_token" text;--> statement-breakpoint
ALTER TABLE "arrivals" ADD CONSTRAINT "arrivals_public_token_unique" UNIQUE("public_token");