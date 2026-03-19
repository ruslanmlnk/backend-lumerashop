import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$
   BEGIN
     IF EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'orders_items'
         AND column_name = 'product_id'
         AND data_type <> 'integer'
     ) THEN
       ALTER TABLE "orders_items"
       ALTER COLUMN "product_id" SET DATA TYPE integer
       USING CASE
         WHEN "product_id" IS NULL THEN NULL
         WHEN "product_id" ~ '^[0-9]+$' THEN "product_id"::integer
         ELSE NULL
       END;
     END IF;
   END $$;

   ALTER TABLE "orders_items" ADD COLUMN IF NOT EXISTS "product_snapshot_id" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ppl_shipment_batch_id" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ppl_shipment_shipment_number" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ppl_shipment_import_state" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ppl_shipment_label_format" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ppl_shipment_label_page_size" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ppl_shipment_label_url" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ppl_shipment_complete_label_url" varchar;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ppl_shipment_generated_at" timestamp(3) with time zone;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ppl_shipment_last_checked_at" timestamp(3) with time zone;
   ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "ppl_shipment_last_error" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DO $$
   BEGIN
     IF EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'orders_items'
         AND column_name = 'product_id'
         AND data_type = 'integer'
     ) THEN
       ALTER TABLE "orders_items" ALTER COLUMN "product_id" SET DATA TYPE varchar;
     END IF;
   END $$;

   ALTER TABLE "orders_items" DROP COLUMN IF EXISTS "product_snapshot_id";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "ppl_shipment_batch_id";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "ppl_shipment_shipment_number";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "ppl_shipment_import_state";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "ppl_shipment_label_format";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "ppl_shipment_label_page_size";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "ppl_shipment_label_url";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "ppl_shipment_complete_label_url";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "ppl_shipment_generated_at";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "ppl_shipment_last_checked_at";
   ALTER TABLE "orders" DROP COLUMN IF EXISTS "ppl_shipment_last_error";`)
}
