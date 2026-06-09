import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    INSERT INTO "category_groups_rels" ("order", "parent_id", "path", "categories_id")
    SELECT 0, group_doc."id", 'category', group_doc."category_id"
    FROM "category_groups" AS group_doc
    WHERE group_doc."category_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "category_groups_rels" AS rel
        WHERE rel."parent_id" = group_doc."id"
          AND rel."path" = 'category'
          AND rel."categories_id" = group_doc."category_id"
      );

    INSERT INTO "category_groups_rels" ("order", "parent_id", "path", "categories_id")
    SELECT
      MIN(COALESCE(source_rel."order", 0)) + 1,
      source_rel."parent_id",
      'category',
      source_rel."categories_id"
    FROM "category_groups_rels" AS source_rel
    WHERE source_rel."path" = 'categories'
      AND source_rel."categories_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "category_groups_rels" AS existing_rel
        WHERE existing_rel."parent_id" = source_rel."parent_id"
          AND existing_rel."path" = 'category'
          AND existing_rel."categories_id" = source_rel."categories_id"
      )
    GROUP BY source_rel."parent_id", source_rel."categories_id";

    DELETE FROM "category_groups_rels" WHERE "path" = 'categories';

    ALTER TABLE "category_groups"
      DROP CONSTRAINT IF EXISTS "category_groups_category_id_categories_id_fk";

    DROP INDEX IF EXISTS "category_groups_category_idx";

    ALTER TABLE "category_groups"
      DROP COLUMN IF EXISTS "category_id";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "category_groups"
      ADD COLUMN IF NOT EXISTS "category_id" integer;

    UPDATE "category_groups" AS group_doc
    SET "category_id" = first_category."categories_id"
    FROM (
      SELECT DISTINCT ON ("parent_id")
        "parent_id",
        "categories_id"
      FROM "category_groups_rels"
      WHERE "path" = 'category'
        AND "categories_id" IS NOT NULL
      ORDER BY "parent_id", COALESCE("order", 0), "id"
    ) AS first_category
    WHERE group_doc."id" = first_category."parent_id";

    INSERT INTO "category_groups_rels" ("order", "parent_id", "path", "categories_id")
    SELECT
      COALESCE(category_rel."order", 0),
      category_rel."parent_id",
      'categories',
      category_rel."categories_id"
    FROM "category_groups_rels" AS category_rel
    WHERE category_rel."path" = 'category'
      AND category_rel."categories_id" IS NOT NULL;

    DELETE FROM "category_groups_rels" WHERE "path" = 'category';

    CREATE INDEX IF NOT EXISTS "category_groups_category_idx"
      ON "category_groups" ("category_id");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'category_groups_category_id_categories_id_fk'
      ) THEN
        ALTER TABLE "category_groups"
          ADD CONSTRAINT "category_groups_category_id_categories_id_fk"
          FOREIGN KEY ("category_id") REFERENCES "categories"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;
  `)
}
