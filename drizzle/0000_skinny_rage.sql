CREATE TABLE "files" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"filename" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"mime_type" text NOT NULL,
	"s3_key" text NOT NULL,
	"size" integer NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "files_s3_key_unique" UNIQUE("s3_key")
);
--> statement-breakpoint
CREATE TABLE "memos" (
	"content" varchar(1000) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL,
	CONSTRAINT "memos_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memos" ADD CONSTRAINT "memos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_user_id_idx" ON "files" USING btree ("user_id");