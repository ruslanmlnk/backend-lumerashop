import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='delivery_time') THEN
        ALTER TABLE "products" ADD COLUMN "delivery_time" numeric;
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stock_status') THEN
        ALTER TABLE "products" DROP COLUMN "stock_status";
      END IF;
    END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock_status" varchar DEFAULT 'in-stock';
    ALTER TABLE "products" DROP COLUMN IF EXISTS "delivery_time";
  `)
}
