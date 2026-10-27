ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "whatsapp" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "vendor_daily_stats" ADD COLUMN "instagram" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "instagram" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "show_phone" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "primary_contact" text DEFAULT 'whatsapp' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "cover_image_key" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "logo_image_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");