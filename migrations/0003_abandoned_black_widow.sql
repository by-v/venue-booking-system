CREATE TABLE "date_lock" (
	"date" date PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"reservation_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "date_lock_kind" CHECK ("date_lock"."kind" in ('EVENT','SETUP'))
);
