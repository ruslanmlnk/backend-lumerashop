import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "category_groups_rels"
      ADD COLUMN IF NOT EXISTS "categories_id" integer;

    CREATE INDEX IF NOT EXISTS "category_groups_rels_categories_id_idx"
      ON "category_groups_rels" ("categories_id");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'category_groups_rels_categories_fk'
      ) THEN
        ALTER TABLE "category_groups_rels"
          ADD CONSTRAINT "category_groups_rels_categories_fk"
          FOREIGN KEY ("categories_id") REFERENCES "categories"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;

    INSERT INTO "category_groups_rels" ("order", "parent_id", "path", "categories_id")
    SELECT 0, group_doc."id", 'categories', group_doc."category_id"
    FROM "category_groups" AS group_doc
    WHERE group_doc."category_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "category_groups_rels" AS rel
        WHERE rel."parent_id" = group_doc."id"
          AND rel."path" = 'categories'
          AND rel."categories_id" = group_doc."category_id"
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "category_groups_rels" WHERE "path" = 'categories';

    ALTER TABLE "category_groups_rels"
      DROP CONSTRAINT IF EXISTS "category_groups_rels_categories_fk";

    DROP INDEX IF EXISTS "category_groups_rels_categories_id_idx";

    ALTER TABLE "category_groups_rels"
      DROP COLUMN IF EXISTS "categories_id";
  `)
}
