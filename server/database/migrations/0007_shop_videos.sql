CREATE TABLE "vendor_videos" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"cover_image_key" text,
	"aspect" text DEFAULT 'portrait' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"checked_at" timestamp with time zone,
	"problem_reported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendor_videos" ADD CONSTRAINT "vendor_videos_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_videos_post_idx" ON "vendor_videos" USING btree ("vendor_id","provider","external_id");--> statement-breakpoint
CREATE INDEX "vendor_videos_vendor_idx" ON "vendor_videos" USING btree ("vendor_id","status","position");