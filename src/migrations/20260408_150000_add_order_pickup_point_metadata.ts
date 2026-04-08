import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "shipping_pickup_point_type" varchar,
      ADD COLUMN IF NOT EXISTS "shipping_pickup_point_carrier_id" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "shipping_pickup_point_carrier_id",
      DROP COLUMN IF EXISTS "shipping_pickup_point_type";
  `)
}
