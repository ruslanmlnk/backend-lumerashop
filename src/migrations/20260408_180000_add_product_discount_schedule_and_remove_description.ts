import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "discount_type" varchar,
      ADD COLUMN IF NOT EXISTS "discount_price" numeric,
      ADD COLUMN IF NOT EXISTS "discount_percent" numeric,
      ADD COLUMN IF NOT EXISTS "discount_valid_until" timestamp(3) with time zone;

    UPDATE "products"
    SET
      "discount_type" = COALESCE(
        "discount_type",
        CASE
          WHEN "old_price" IS NOT NULL AND "old_price" > "price" THEN 'price'
          ELSE NULL
        END
      ),
      "discount_price" = COALESCE(
        "discount_price",
        CASE
          WHEN "old_price" IS NOT NULL AND "old_price" > "price" THEN "price"
          ELSE NULL
        END
      ),
      "price" = CASE
        WHEN "old_price" IS NOT NULL AND "old_price" > "price" THEN "old_price"
        ELSE "price"
      END,
      "old_price" = CASE
        WHEN "old_price" IS NOT NULL AND "old_price" > "price" THEN NULL
        ELSE "old_price"
      END;

    ALTER TABLE "products"
      DROP COLUMN IF EXISTS "description";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "description" varchar;

    UPDATE "products"
    SET
      "old_price" = CASE
        WHEN "discount_type" = 'price'
          AND "discount_price" IS NOT NULL
          AND "discount_price" > 0
          AND "discount_price" < "price"
          THEN "price"
        WHEN "discount_type" = 'percent'
          AND COALESCE("discount_percent", 0) > 0
          THEN "price"
        ELSE "old_price"
      END,
      "price" = CASE
        WHEN "discount_type" = 'price'
          AND "discount_price" IS NOT NULL
          AND "discount_price" > 0
          AND "discount_price" < "price"
          THEN "discount_price"
        WHEN "discount_type" = 'percent'
          AND COALESCE("discount_percent", 0) > 0
          THEN ROUND(("price" * (100 - LEAST(GREATEST(COALESCE("discount_percent", 0), 0), 100)) / 100.0)::numeric, 2)
        ELSE "price"
      END;

    ALTER TABLE "products"
      DROP COLUMN IF EXISTS "discount_type",
      DROP COLUMN IF EXISTS "discount_price",
      DROP COLUMN IF EXISTS "discount_percent",
      DROP COLUMN IF EXISTS "discount_valid_until";
  `)
}
