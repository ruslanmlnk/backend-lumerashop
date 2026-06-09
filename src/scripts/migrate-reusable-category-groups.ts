import 'dotenv/config'

import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL?.trim()

if (!connectionString) {
  throw new Error('DATABASE_URL is required.')
}

const pool = new Pool({ connectionString })

async function migrateReusableCategoryGroups() {
  const result = await pool.query(`
    INSERT INTO "category_groups_rels" ("order", "parent_id", "path", "categories_id")
    SELECT 0, group_doc."id", 'categories', group_doc."category_id"
    FROM "category_groups" AS group_doc
    WHERE group_doc."category_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "category_groups_rels" AS rel
        WHERE rel."parent_id" = group_doc."id"
          AND rel."path" = 'categories'
          AND rel."categories_id" = group_doc."category_id"
      )
  `)

  const counts = await pool.query<{
    category_links: string
    groups: string
  }>(`
    SELECT
      (SELECT COUNT(*) FROM "category_groups")::text AS groups,
      (
        SELECT COUNT(*)
        FROM "category_groups_rels"
        WHERE "path" = 'categories'
          AND "categories_id" IS NOT NULL
      )::text AS category_links
  `)

  console.log(
    `Added ${result.rowCount ?? 0} missing reusable category links. ` +
      `Groups: ${counts.rows[0]?.groups ?? '0'}, category links: ${counts.rows[0]?.category_links ?? '0'}.`,
  )
}

migrateReusableCategoryGroups()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error)
    await pool.end()
    process.exitCode = 1
  })
