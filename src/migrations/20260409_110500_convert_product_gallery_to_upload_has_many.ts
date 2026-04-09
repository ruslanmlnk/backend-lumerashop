import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_rels"
      ADD COLUMN IF NOT EXISTS "media_id" integer;

    CREATE INDEX IF NOT EXISTS "products_rels_media_id_idx" ON "products_rels" ("media_id");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_rels_media_fk'
      ) THEN
        ALTER TABLE "products_rels"
          ADD CONSTRAINT "products_rels_media_fk"
          FOREIGN KEY ("media_id") REFERENCES "media"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
      END IF;
    END $$;

    INSERT INTO "products_rels" ("order", "parent_id", "path", "media_id")
    SELECT
      gallery."_order",
      gallery."_parent_id",
      'gallery',
      gallery."image_id"
    FROM "products_gallery" AS gallery
    WHERE gallery."image_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "products_rels" AS rels
        WHERE rels."parent_id" = gallery."_parent_id"
          AND rels."path" = 'gallery'
          AND rels."media_id" = gallery."image_id"
          AND COALESCE(rels."order", -1) = COALESCE(gallery."_order", -1)
      );

    DROP TABLE IF EXISTS "products_gallery";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "products_gallery" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "image_id" integer
    );

    CREATE INDEX IF NOT EXISTS "products_gallery_order_idx" ON "products_gallery" ("_order");
    CREATE INDEX IF NOT EXISTS "products_gallery_parent_id_idx" ON "products_gallery" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "products_gallery_image_idx" ON "products_gallery" ("image_id");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_gallery_image_id_media_id_fk'
      ) THEN
        ALTER TABLE "products_gallery"
          ADD CONSTRAINT "products_gallery_image_id_media_id_fk"
          FOREIGN KEY ("image_id") REFERENCES "media"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_gallery_parent_id_fk'
      ) THEN
        ALTER TABLE "products_gallery"
          ADD CONSTRAINT "products_gallery_parent_id_fk"
          FOREIGN KEY ("_parent_id") REFERENCES "products"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
      END IF;
    END $$;

    INSERT INTO "products_gallery" ("_order", "_parent_id", "id", "image_id")
    SELECT
      COALESCE(rels."order", 0),
      rels."parent_id",
      md5(random()::text || clock_timestamp()::text || rels."id"::text),
      rels."media_id"
    FROM "products_rels" AS rels
    WHERE rels."path" = 'gallery'
      AND rels."media_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "products_gallery" AS gallery
        WHERE gallery."_parent_id" = rels."parent_id"
          AND gallery."image_id" = rels."media_id"
          AND COALESCE(gallery."_order", -1) = COALESCE(rels."order", -1)
      );

    DELETE FROM "products_rels"
    WHERE "path" = 'gallery'
      AND "media_id" IS NOT NULL;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_rels_media_fk'
      ) THEN
        ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_media_fk";
      END IF;
    END $$;

    DROP INDEX IF EXISTS "products_rels_media_id_idx";

    ALTER TABLE "products_rels"
      DROP COLUMN IF EXISTS "media_id";
  `)
}
