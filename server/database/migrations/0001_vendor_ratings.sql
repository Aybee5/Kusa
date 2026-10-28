ALTER TABLE "vendors" ADD COLUMN "rating_avg" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "rating_breakdown" jsonb DEFAULT '[0,0,0,0,0]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vendors_rating_idx" ON "vendors" USING btree ("status","rating_avg" DESC NULLS LAST,"rating_count" DESC NULLS LAST);--> statement-breakpoint
-- Recount the stored rating for the given businesses: published reviews from
-- accounts that aren't suspended, the same rule the public rating always used.
CREATE OR REPLACE FUNCTION kusa_refresh_vendor_ratings(ids text[]) RETURNS void LANGUAGE sql AS $$
  UPDATE vendors v
  SET rating_count = coalesce(s.n, 0),
      rating_avg = coalesce(s.avg, 0),
      rating_breakdown = coalesce(s.breakdown, '[0,0,0,0,0]'::jsonb)
  FROM (SELECT DISTINCT unnest(ids) AS id) ids_
  LEFT JOIN (
    SELECT r.vendor_id,
      count(*)::int AS n,
      round(avg(r.stars), 1)::float8 AS avg,
      jsonb_build_array(
        count(*) FILTER (WHERE r.stars = 5), count(*) FILTER (WHERE r.stars = 4), count(*) FILTER (WHERE r.stars = 3),
        count(*) FILTER (WHERE r.stars = 2), count(*) FILTER (WHERE r.stars = 1)
      ) AS breakdown
    FROM reviews r
    JOIN users u ON u.id = r.user_id AND u.status <> 'suspended'
    WHERE r.vendor_id = ANY(ids) AND r.status = 'published'
    GROUP BY r.vendor_id
  ) s ON s.vendor_id = ids_.id
  WHERE v.id = ids_.id
$$;
--> statement-breakpoint
-- Statement-level: one recount per write, for just the businesses it touched.
CREATE OR REPLACE FUNCTION kusa_reviews_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM kusa_refresh_vendor_ratings(ARRAY(SELECT vendor_id FROM new_rows));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM kusa_refresh_vendor_ratings(ARRAY(SELECT vendor_id FROM old_rows));
  ELSE
    PERFORM kusa_refresh_vendor_ratings(ARRAY(
      SELECT unnest(ARRAY[o.vendor_id, n.vendor_id])
      FROM old_rows o JOIN new_rows n ON n.id = o.id
      WHERE (o.stars, o.status, o.vendor_id) IS DISTINCT FROM (n.stars, n.status, n.vendor_id)));
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER reviews_rating_insert AFTER INSERT ON reviews
  REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION kusa_reviews_changed();
--> statement-breakpoint
CREATE TRIGGER reviews_rating_delete AFTER DELETE ON reviews
  REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION kusa_reviews_changed();
--> statement-breakpoint
CREATE TRIGGER reviews_rating_update AFTER UPDATE ON reviews
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION kusa_reviews_changed();
--> statement-breakpoint
-- Suspending or reinstating a shopper removes or restores all their ratings.
CREATE OR REPLACE FUNCTION kusa_reviewer_status_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM kusa_refresh_vendor_ratings(ARRAY(
    SELECT r.vendor_id
    FROM old_rows o JOIN new_rows n ON n.id = o.id JOIN reviews r ON r.user_id = n.id
    WHERE (o.status = 'suspended') IS DISTINCT FROM (n.status = 'suspended')));
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER users_rating_status AFTER UPDATE ON users
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION kusa_reviewer_status_changed();
--> statement-breakpoint
SELECT kusa_refresh_vendor_ratings(ARRAY(SELECT id FROM vendors));
