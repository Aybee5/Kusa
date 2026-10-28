-- Sign-in codes can go to an email address as well as a phone number.
-- Existing rows hold a phone number; prefix them so they stay valid.
ALTER TABLE "otp_codes" RENAME COLUMN "phone" TO "target";--> statement-breakpoint
UPDATE "otp_codes" SET "target" = 'phone:' || "target";
