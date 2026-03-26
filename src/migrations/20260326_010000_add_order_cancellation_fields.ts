import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "is_canceled" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "canceled_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "cancellation_email_sent_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "cancellation_email_sent_at",
      DROP COLUMN IF EXISTS "canceled_at",
      DROP COLUMN IF EXISTS "is_canceled";
  `)
}
