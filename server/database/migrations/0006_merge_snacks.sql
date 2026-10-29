-- "Snacks" is now part of "Small chops & snacks".
UPDATE "vendors" SET "category" = 'small-chops' WHERE "category" = 'snacks';--> statement-breakpoint
UPDATE "promotions" SET "category" = 'small-chops' WHERE "category" = 'snacks';
