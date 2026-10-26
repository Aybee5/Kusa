CREATE TABLE "otp_codes" (
	"phone" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_daily_views" (
	"product_id" text NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_daily_views_product_id_day_pk" PRIMARY KEY("product_id","day")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"options" jsonb,
	"description" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tint" text DEFAULT '#F6E3C8' NOT NULL,
	"photo_label" text DEFAULT '' NOT NULL,
	"image_key" text,
	"available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"user_id" text NOT NULL,
	"stars" smallint NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"flag_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'shopper' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"suspension_reason" text,
	"area" text DEFAULT '' NOT NULL,
	"tint" text DEFAULT '#E3F1EA' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_daily_stats" (
	"vendor_id" text NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"visitors" integer DEFAULT 0 NOT NULL,
	"whatsapp" integer DEFAULT 0 NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"directions" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "vendor_daily_stats_vendor_id_day_pk" PRIMARY KEY("vendor_id","day")
);
--> statement-breakpoint
CREATE TABLE "vendor_source_stats" (
	"vendor_id" text NOT NULL,
	"day" date NOT NULL,
	"source" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "vendor_source_stats_vendor_id_day_source_pk" PRIMARY KEY("vendor_id","day","source")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"phone" text NOT NULL,
	"whatsapp" text NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"city" text DEFAULT 'Kano' NOT NULL,
	"landmark" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"suspension_reason" text,
	"review_note" text,
	"opens" text DEFAULT '09:00' NOT NULL,
	"closes" text DEFAULT '18:00' NOT NULL,
	"closed_days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delivery" boolean DEFAULT true NOT NULL,
	"pickup" boolean DEFAULT true NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"tint" text DEFAULT '#F4B740' NOT NULL,
	"cover_tint" text DEFAULT '#F6E3C8' NOT NULL,
	"id_type" text,
	"id_photo_key" text,
	"selfie_key" text,
	"proof_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "product_daily_views" ADD CONSTRAINT "product_daily_views_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_daily_stats" ADD CONSTRAINT "vendor_daily_stats_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_source_stats" ADD CONSTRAINT "vendor_source_stats_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_vendor_idx" ON "products" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "products_created_idx" ON "products" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_vendor_user_idx" ON "reviews" USING btree ("vendor_id","user_id");--> statement-breakpoint
CREATE INDEX "reviews_vendor_status_idx" ON "reviews" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_role_status_idx" ON "users" USING btree ("role","status");--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_slug_idx" ON "vendors" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "vendors_owner_idx" ON "vendors" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "vendors_status_idx" ON "vendors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendors_lat_lng_idx" ON "vendors" USING btree ("lat","lng");