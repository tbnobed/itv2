CREATE TABLE "streams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"thumbnail" text NOT NULL,
	"stream_id" text NOT NULL,
	"url" text NOT NULL,
	"category" text NOT NULL,
	"studio_id" text,
	"stream_type" text DEFAULT 'webrtc' NOT NULL,
	CONSTRAINT "streams_stream_id_unique" UNIQUE("stream_id")
);
--> statement-breakpoint
CREATE TABLE "studios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"thumbnail" text NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"feed_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"is_active" text DEFAULT 'true' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
