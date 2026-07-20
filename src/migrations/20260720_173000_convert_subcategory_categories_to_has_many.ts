import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "subcategories_rels"
      ADD COLUMN IF NOT EXISTS "categories_id" integer;

    CREATE INDEX IF NOT EXISTS "subcategories_rels_categories_id_idx"
      ON "subcategories_rels" ("categories_id");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'subcategories_rels_categories_fk'
      ) THEN
        ALTER TABLE "subcategories_rels"
          ADD CONSTRAINT "subcategories_rels_categories_fk"
          FOREIGN KEY ("categories_id") REFERENCES "categories"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;

    INSERT INTO "subcategories_rels" ("order", "parent_id", "path", "categories_id")
    SELECT 0, subcategory."id", 'categories', subcategory."category_id"
    FROM "subcategories" AS subcategory
    WHERE subcategory."category_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "subcategories_rels" AS rel
        WHERE rel."parent_id" = subcategory."id"
          AND rel."path" = 'categories'
          AND rel."categories_id" = subcategory."category_id"
      );

    ALTER TABLE "subcategories"
      DROP CONSTRAINT IF EXISTS "subcategories_category_id_categories_id_fk";

    DROP INDEX IF EXISTS "subcategories_category_idx";

    ALTER TABLE "subcategories"
      DROP COLUMN IF EXISTS "category_id";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "subcategories"
      ADD COLUMN IF NOT EXISTS "category_id" integer;

    UPDATE "subcategories" AS subcategory
    SET "category_id" = first_category."categories_id"
    FROM (
      SELECT DISTINCT ON ("parent_id")
        "parent_id",
        "categories_id"
      FROM "subcategories_rels"
      WHERE "path" = 'categories'
        AND "categories_id" IS NOT NULL
      ORDER BY "parent_id", COALESCE("order", 0), "id"
    ) AS first_category
    WHERE subcategory."id" = first_category."parent_id";

    DELETE FROM "subcategories_rels" WHERE "path" = 'categories';

    ALTER TABLE "subcategories_rels"
      DROP CONSTRAINT IF EXISTS "subcategories_rels_categories_fk";

    DROP INDEX IF EXISTS "subcategories_rels_categories_id_idx";

    ALTER TABLE "subcategories_rels"
      DROP COLUMN IF EXISTS "categories_id";

    CREATE INDEX IF NOT EXISTS "subcategories_category_idx"
      ON "subcategories" ("category_id");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'subcategories_category_id_categories_id_fk'
      ) THEN
        ALTER TABLE "subcategories"
          ADD CONSTRAINT "subcategories_category_id_categories_id_fk"
          FOREIGN KEY ("category_id") REFERENCES "categories"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `)
}
