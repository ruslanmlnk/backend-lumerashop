import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "first_purchase_promo" (
      "id" serial PRIMARY KEY NOT NULL,
      "discount_amount" numeric DEFAULT 100 NOT NULL,
      "icon_id" integer,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    CREATE INDEX IF NOT EXISTS "first_purchase_promo_icon_idx" ON "first_purchase_promo" USING btree ("icon_id");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'first_purchase_promo_icon_id_media_id_fk'
      ) THEN
        ALTER TABLE "first_purchase_promo"
          ADD CONSTRAINT "first_purchase_promo_icon_id_media_id_fk"
          FOREIGN KEY ("icon_id") REFERENCES "media"("id")
          ON DELETE SET NULL
          ON UPDATE NO ACTION;
      END IF;
    END $$;

    INSERT INTO "first_purchase_promo" ("discount_amount", "updated_at", "created_at")
    SELECT 100, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM "first_purchase_promo"
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "first_purchase_promo"
      DROP CONSTRAINT IF EXISTS "first_purchase_promo_icon_id_media_id_fk";

    DROP INDEX IF EXISTS "first_purchase_promo_icon_idx";
    DROP TABLE IF EXISTS "first_purchase_promo";
  `)
}
