import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "free_shipping_threshold" numeric DEFAULT 1500;

    UPDATE "site_settings"
    SET "free_shipping_threshold" = 1500
    WHERE "free_shipping_threshold" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "free_shipping_threshold";
  `)
}
