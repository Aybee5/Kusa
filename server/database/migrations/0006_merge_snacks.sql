-- "Snacks" is now part of "Small chops & snacks", and clothing is part of "Fashion".
UPDATE "vendors" SET "category" = 'small-chops' WHERE "category" = 'snacks';--> statement-breakpoint
UPDATE "promotions" SET "category" = 'small-chops' WHERE "category" = 'snacks';--> statement-breakpoint
UPDATE "vendors" SET "category" = 'fashion' WHERE "category" = 'clothing';--> statement-breakpoint
UPDATE "promotions" SET "category" = 'fashion' WHERE "category" = 'clothing';
