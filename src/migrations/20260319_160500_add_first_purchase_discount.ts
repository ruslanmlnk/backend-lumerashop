import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "first_purchase_discount_used" boolean DEFAULT false;

    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "discounts_first_purchase_discount_amount" numeric DEFAULT 0;

    UPDATE "users"
    SET "first_purchase_discount_used" = COALESCE("first_purchase_discount_used", false)
    WHERE "first_purchase_discount_used" IS NULL;

    UPDATE "orders"
    SET "discounts_first_purchase_discount_amount" = COALESCE("discounts_first_purchase_discount_amount", 0)
    WHERE "discounts_first_purchase_discount_amount" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "discounts_first_purchase_discount_amount";

    ALTER TABLE "users"
      DROP COLUMN IF EXISTS "first_purchase_discount_used";
  `)
}
