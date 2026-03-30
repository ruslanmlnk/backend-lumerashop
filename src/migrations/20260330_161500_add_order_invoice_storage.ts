import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "invoice_generated_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "invoice_file_name" varchar,
      ADD COLUMN IF NOT EXISTS "invoice_content_type" varchar,
      ADD COLUMN IF NOT EXISTS "invoice_data" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "invoice_data",
      DROP COLUMN IF EXISTS "invoice_content_type",
      DROP COLUMN IF EXISTS "invoice_file_name",
      DROP COLUMN IF EXISTS "invoice_generated_at";
  `)
}
