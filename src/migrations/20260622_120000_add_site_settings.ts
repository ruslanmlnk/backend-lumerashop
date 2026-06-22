import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "site_settings" (
      "id" serial PRIMARY KEY NOT NULL,
      "hide_stripe" boolean DEFAULT false,
      "hide_global_payments" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    INSERT INTO "site_settings" ("hide_stripe", "hide_global_payments", "updated_at", "created_at")
    SELECT false, false, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM "site_settings"
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "site_settings";
  `)
}
