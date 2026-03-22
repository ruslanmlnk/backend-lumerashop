import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories"
      ADD COLUMN IF NOT EXISTS "show_in_desktop_dropdown_menu" boolean DEFAULT false;

    UPDATE "categories"
    SET "show_in_desktop_dropdown_menu" = COALESCE("show_in_desktop_dropdown_menu", false)
    WHERE "show_in_desktop_dropdown_menu" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories"
      DROP COLUMN IF EXISTS "show_in_desktop_dropdown_menu";
  `)
}
