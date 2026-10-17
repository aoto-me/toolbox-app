ALTER TABLE "memos" ALTER COLUMN "content" SET DATA TYPE varchar(30000);--> statement-breakpoint
ALTER TABLE "memos" ALTER COLUMN "content" SET DEFAULT '';