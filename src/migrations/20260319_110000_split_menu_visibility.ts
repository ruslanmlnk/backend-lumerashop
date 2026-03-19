import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories"
      ADD COLUMN "show_in_desktop_menu" boolean DEFAULT false,
      ADD COLUMN "show_in_mobile_menu" boolean DEFAULT false;

    ALTER TABLE "category_groups"
      ADD COLUMN "show_in_desktop_menu" boolean DEFAULT false,
      ADD COLUMN "show_in_mobile_menu" boolean DEFAULT false;

    ALTER TABLE "subcategories"
      ADD COLUMN "show_in_desktop_menu" boolean DEFAULT false,
      ADD COLUMN "show_in_mobile_menu" boolean DEFAULT false;

    UPDATE "categories"
    SET
      "show_in_desktop_menu" = COALESCE("show_in_menu", false),
      "show_in_mobile_menu" = COALESCE("show_in_menu", false)
    WHERE "show_in_desktop_menu" IS NULL OR "show_in_mobile_menu" IS NULL;

    UPDATE "category_groups"
    SET
      "show_in_desktop_menu" = COALESCE("show_in_menu", false),
      "show_in_mobile_menu" = COALESCE("show_in_menu", false)
    WHERE "show_in_desktop_menu" IS NULL OR "show_in_mobile_menu" IS NULL;

    UPDATE "subcategories"
    SET
      "show_in_desktop_menu" = COALESCE("show_in_menu", false),
      "show_in_mobile_menu" = COALESCE("show_in_menu", false)
    WHERE "show_in_desktop_menu" IS NULL OR "show_in_mobile_menu" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "categories"
      DROP COLUMN "show_in_desktop_menu",
      DROP COLUMN "show_in_mobile_menu";

    ALTER TABLE "category_groups"
      DROP COLUMN "show_in_desktop_menu",
      DROP COLUMN "show_in_mobile_menu";

    ALTER TABLE "subcategories"
      DROP COLUMN "show_in_desktop_menu",
      DROP COLUMN "show_in_mobile_menu";
  `)
}
