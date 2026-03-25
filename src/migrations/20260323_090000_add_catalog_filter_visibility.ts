import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "categories_rels" (
      "id" serial PRIMARY KEY,
      "order" integer,
      "parent_id" integer NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
      "path" character varying NOT NULL,
      "filter_groups_id" integer REFERENCES "filter_groups"("id") ON DELETE CASCADE,
      "filter_options_id" integer REFERENCES "filter_options"("id") ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "categories_rels_order_idx" ON "categories_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "categories_rels_parent_idx" ON "categories_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "categories_rels_path_idx" ON "categories_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "categories_rels_filter_groups_id_idx" ON "categories_rels" USING btree ("filter_groups_id");
    CREATE INDEX IF NOT EXISTS "categories_rels_filter_options_id_idx" ON "categories_rels" USING btree ("filter_options_id");

    CREATE TABLE IF NOT EXISTS "category_groups_rels" (
      "id" serial PRIMARY KEY,
      "order" integer,
      "parent_id" integer NOT NULL REFERENCES "category_groups"("id") ON DELETE CASCADE,
      "path" character varying NOT NULL,
      "filter_groups_id" integer REFERENCES "filter_groups"("id") ON DELETE CASCADE,
      "filter_options_id" integer REFERENCES "filter_options"("id") ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "category_groups_rels_order_idx" ON "category_groups_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "category_groups_rels_parent_idx" ON "category_groups_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "category_groups_rels_path_idx" ON "category_groups_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "category_groups_rels_filter_groups_id_idx" ON "category_groups_rels" USING btree ("filter_groups_id");
    CREATE INDEX IF NOT EXISTS "category_groups_rels_filter_options_id_idx" ON "category_groups_rels" USING btree ("filter_options_id");

    CREATE TABLE IF NOT EXISTS "subcategories_rels" (
      "id" serial PRIMARY KEY,
      "order" integer,
      "parent_id" integer NOT NULL REFERENCES "subcategories"("id") ON DELETE CASCADE,
      "path" character varying NOT NULL,
      "filter_groups_id" integer REFERENCES "filter_groups"("id") ON DELETE CASCADE,
      "filter_options_id" integer REFERENCES "filter_options"("id") ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "subcategories_rels_order_idx" ON "subcategories_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "subcategories_rels_parent_idx" ON "subcategories_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "subcategories_rels_path_idx" ON "subcategories_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "subcategories_rels_filter_groups_id_idx" ON "subcategories_rels" USING btree ("filter_groups_id");
    CREATE INDEX IF NOT EXISTS "subcategories_rels_filter_options_id_idx" ON "subcategories_rels" USING btree ("filter_options_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "subcategories_rels";
    DROP TABLE IF EXISTS "category_groups_rels";
    DROP TABLE IF EXISTS "categories_rels";
  `)
}
