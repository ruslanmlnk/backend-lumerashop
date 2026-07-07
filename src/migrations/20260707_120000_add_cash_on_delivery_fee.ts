import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "cash_on_delivery_fee" numeric DEFAULT 49;

    UPDATE "site_settings"
    SET "cash_on_delivery_fee" = 49
    WHERE "cash_on_delivery_fee" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "cash_on_delivery_fee";
  `)
}
