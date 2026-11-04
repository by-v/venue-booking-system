ALTER TABLE "payment" ADD COLUMN "verification_reason" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "verified_by_user_id" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "status_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_verified_by_user_id_user_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;