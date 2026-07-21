import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "invoice_counters" (
      "year" integer PRIMARY KEY,
      "last_value" integer NOT NULL,
      "updated_at" timestamp(3) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "invoice_counters_last_value_positive" CHECK ("last_value" > 0)
    );

    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "invoice_number" varchar;

    CREATE UNIQUE INDEX IF NOT EXISTS "orders_invoice_number_idx"
      ON "orders" ("invoice_number")
      WHERE "invoice_number" IS NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "orders_invoice_number_idx";

    ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "invoice_number";

    DROP TABLE IF EXISTS "invoice_counters";
  `)
}
