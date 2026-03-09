import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders_items" ALTER COLUMN "product_id" SET DATA TYPE integer;
  ALTER TABLE "orders_items" ADD COLUMN "product_snapshot_id" varchar;
  ALTER TABLE "orders" ADD COLUMN "ppl_shipment_batch_id" varchar;
  ALTER TABLE "orders" ADD COLUMN "ppl_shipment_shipment_number" varchar;
  ALTER TABLE "orders" ADD COLUMN "ppl_shipment_import_state" varchar;
  ALTER TABLE "orders" ADD COLUMN "ppl_shipment_label_format" varchar;
  ALTER TABLE "orders" ADD COLUMN "ppl_shipment_label_page_size" varchar;
  ALTER TABLE "orders" ADD COLUMN "ppl_shipment_label_url" varchar;
  ALTER TABLE "orders" ADD COLUMN "ppl_shipment_complete_label_url" varchar;
  ALTER TABLE "orders" ADD COLUMN "ppl_shipment_generated_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "ppl_shipment_last_checked_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "ppl_shipment_last_error" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders_items" ALTER COLUMN "product_id" SET DATA TYPE varchar;
  ALTER TABLE "orders_items" DROP COLUMN "product_snapshot_id";
  ALTER TABLE "orders" DROP COLUMN "ppl_shipment_batch_id";
  ALTER TABLE "orders" DROP COLUMN "ppl_shipment_shipment_number";
  ALTER TABLE "orders" DROP COLUMN "ppl_shipment_import_state";
  ALTER TABLE "orders" DROP COLUMN "ppl_shipment_label_format";
  ALTER TABLE "orders" DROP COLUMN "ppl_shipment_label_page_size";
  ALTER TABLE "orders" DROP COLUMN "ppl_shipment_label_url";
  ALTER TABLE "orders" DROP COLUMN "ppl_shipment_complete_label_url";
  ALTER TABLE "orders" DROP COLUMN "ppl_shipment_generated_at";
  ALTER TABLE "orders" DROP COLUMN "ppl_shipment_last_checked_at";
  ALTER TABLE "orders" DROP COLUMN "ppl_shipment_last_error";`)
}
