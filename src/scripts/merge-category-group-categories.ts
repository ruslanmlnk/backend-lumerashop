import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

type QueryResult<Row = Record<string, unknown>> = {
  rows: Row[]
  rowCount: number | null
}

type QueryablePool = {
  query: <Row = Record<string, unknown>>(query: string, values?: unknown[]) => Promise<QueryResult<Row>>
}

type PayloadWithPostgresPool = {
  db?: {
    pool?: QueryablePool
  }
}

async function mergeCategoryGroupCategories() {
  process.env.PAYLOAD_MIGRATING = 'true'

  const payload = (await getPayload({ config })) as PayloadWithPostgresPool
  const pool = payload.db?.pool

  if (!pool) {
    throw new Error('Postgres pool is not available on payload.db.')
  }

  const legacyColumn = await pool.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'category_groups'
        AND column_name = 'category_id'
    ) AS "exists"
  `)

  if (legacyColumn.rows[0]?.exists !== true) {
    console.log('Category group categories are already merged.')
    return
  }

  const result = await pool.query<{
    inserted_relations: string
    removed_legacy_relations: string
    unique_relations: string
  }>(`
    WITH combined AS (
      SELECT "id" AS parent_id, 0 AS relation_order, "category_id" AS category_id
      FROM "category_groups"
      WHERE "category_id" IS NOT NULL

      UNION ALL

      SELECT "parent_id", COALESCE("order", 0) + 1, "categories_id"
      FROM "category_groups_rels"
      WHERE "path" = 'categories'
        AND "categories_id" IS NOT NULL
    ),
    unique_categories AS (
      SELECT parent_id, category_id, MIN(relation_order) AS relation_order
      FROM combined
      GROUP BY parent_id, category_id
    ),
    inserted AS (
      INSERT INTO "category_groups_rels" ("order", "parent_id", "path", "categories_id")
      SELECT relation_order, parent_id, 'category', category_id
      FROM unique_categories
      WHERE NOT EXISTS (
        SELECT 1
        FROM "category_groups_rels" AS existing_rel
        WHERE existing_rel."parent_id" = unique_categories.parent_id
          AND existing_rel."path" = 'category'
          AND existing_rel."categories_id" = unique_categories.category_id
      )
      RETURNING "id"
    ),
    deleted AS (
      DELETE FROM "category_groups_rels"
      WHERE "path" = 'categories'
      RETURNING "id"
    )
    SELECT
      (SELECT COUNT(*) FROM unique_categories)::text AS unique_relations,
      (SELECT COUNT(*) FROM inserted)::text AS inserted_relations,
      (SELECT COUNT(*) FROM deleted)::text AS removed_legacy_relations
  `)

  const counts = result.rows[0]
  console.log(
    [
      'Category group categories merged.',
      `unique=${counts?.unique_relations ?? '0'}`,
      `inserted=${counts?.inserted_relations ?? '0'}`,
      `removedLegacy=${counts?.removed_legacy_relations ?? '0'}`,
    ].join(' '),
  )
}

mergeCategoryGroupCategories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
