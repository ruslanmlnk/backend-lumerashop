import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      DROP CONSTRAINT IF EXISTS "products_category_id_categories_id_fk",
      DROP CONSTRAINT IF EXISTS "products_category_group_id_category_groups_id_fk";

    DROP INDEX IF EXISTS "products_category_idx";
    DROP INDEX IF EXISTS "products_category_group_idx";

    ALTER TABLE "products"
      DROP COLUMN IF EXISTS "category_id",
      DROP COLUMN IF EXISTS "category_group_id";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "category_id" integer,
      ADD COLUMN IF NOT EXISTS "category_group_id" integer;

    UPDATE "products" AS product
    SET "category_id" = rel."categories_id"
    FROM (
      SELECT DISTINCT ON ("parent_id")
        "parent_id",
        "categories_id"
      FROM "products_rels"
      WHERE "path" = 'category'
        AND "categories_id" IS NOT NULL
      ORDER BY "parent_id", COALESCE("order", 0), "id"
    ) AS rel
    WHERE product."id" = rel."parent_id";

    UPDATE "products" AS product
    SET "category_group_id" = rel."category_groups_id"
    FROM (
      SELECT DISTINCT ON ("parent_id")
        "parent_id",
        "category_groups_id"
      FROM "products_rels"
      WHERE "path" = 'categoryGroup'
        AND "category_groups_id" IS NOT NULL
      ORDER BY "parent_id", COALESCE("order", 0), "id"
    ) AS rel
    WHERE product."id" = rel."parent_id";

    CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" ("category_id");
    CREATE INDEX IF NOT EXISTS "products_category_group_idx" ON "products" ("category_group_id");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_category_id_categories_id_fk'
      ) THEN
        ALTER TABLE "products"
          ADD CONSTRAINT "products_category_id_categories_id_fk"
          FOREIGN KEY ("category_id") REFERENCES "categories"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_category_group_id_category_groups_id_fk'
      ) THEN
        ALTER TABLE "products"
          ADD CONSTRAINT "products_category_group_id_category_groups_id_fk"
          FOREIGN KEY ("category_group_id") REFERENCES "category_groups"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
      END IF;
    END $$;
  `)
}
