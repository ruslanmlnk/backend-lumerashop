import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_rels"
      ADD COLUMN IF NOT EXISTS "categories_id" integer,
      ADD COLUMN IF NOT EXISTS "category_groups_id" integer;

    CREATE INDEX IF NOT EXISTS "products_rels_categories_id_idx" ON "products_rels" ("categories_id");
    CREATE INDEX IF NOT EXISTS "products_rels_category_groups_id_idx" ON "products_rels" ("category_groups_id");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_rels_categories_fk'
      ) THEN
        ALTER TABLE "products_rels"
          ADD CONSTRAINT "products_rels_categories_fk"
          FOREIGN KEY ("categories_id") REFERENCES "categories"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_rels_category_groups_fk'
      ) THEN
        ALTER TABLE "products_rels"
          ADD CONSTRAINT "products_rels_category_groups_fk"
          FOREIGN KEY ("category_groups_id") REFERENCES "category_groups"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
      END IF;
    END $$;

    INSERT INTO "products_rels" ("order", "parent_id", "path", "categories_id")
    SELECT
      0,
      product."id",
      'category',
      product."category_id"
    FROM "products" AS product
    WHERE product."category_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "products_rels" AS rels
        WHERE rels."parent_id" = product."id"
          AND rels."path" = 'category'
          AND rels."categories_id" = product."category_id"
      );

    INSERT INTO "products_rels" ("order", "parent_id", "path", "category_groups_id")
    SELECT
      0,
      product."id",
      'categoryGroup',
      product."category_group_id"
    FROM "products" AS product
    WHERE product."category_group_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "products_rels" AS rels
        WHERE rels."parent_id" = product."id"
          AND rels."path" = 'categoryGroup'
          AND rels."category_groups_id" = product."category_group_id"
      );
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

    DELETE FROM "products_rels"
    WHERE ("path" = 'category' AND "categories_id" IS NOT NULL)
       OR ("path" = 'categoryGroup' AND "category_groups_id" IS NOT NULL);

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_rels_categories_fk'
      ) THEN
        ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_categories_fk";
      END IF;

      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_rels_category_groups_fk'
      ) THEN
        ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_category_groups_fk";
      END IF;
    END $$;

    DROP INDEX IF EXISTS "products_rels_categories_id_idx";
    DROP INDEX IF EXISTS "products_rels_category_groups_id_idx";

    ALTER TABLE "products_rels"
      DROP COLUMN IF EXISTS "categories_id",
      DROP COLUMN IF EXISTS "category_groups_id";
  `)
}
