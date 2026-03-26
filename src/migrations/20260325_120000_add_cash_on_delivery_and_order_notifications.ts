import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_orders_provider"
      ADD VALUE IF NOT EXISTS 'cash-on-delivery';

    ALTER TABLE "shipping_methods"
      ADD COLUMN IF NOT EXISTS "cash_on_delivery" boolean DEFAULT false;

    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "shipping_cash_on_delivery" boolean DEFAULT false;

    UPDATE "shipping_methods"
    SET "cash_on_delivery" = true
    WHERE "cash_on_delivery" IS DISTINCT FROM true
      AND (
        "method_id"::text LIKE '%-cod'
        OR LOWER(COALESCE("method_id"::text, '')) LIKE '%dobirku%'
      );

    UPDATE "orders"
    SET "shipping_cash_on_delivery" = true
    WHERE "shipping_cash_on_delivery" IS DISTINCT FROM true
      AND (
        "shipping_method_id"::text LIKE '%-cod'
        OR LOWER(COALESCE("provider"::text, '')) = 'cash-on-delivery'
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "shipping_cash_on_delivery";

    ALTER TABLE "shipping_methods"
      DROP COLUMN IF EXISTS "cash_on_delivery";
  `)
}
