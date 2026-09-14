import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "review_request_sent_at" timestamp(3) with time zone;`)
  await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "review_request_started_at" timestamp(3) with time zone;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "orders" DROP COLUMN IF EXISTS "review_request_sent_at";`)
  await db.execute(sql`ALTER TABLE "orders" DROP COLUMN IF EXISTS "review_request_started_at";`)
}
