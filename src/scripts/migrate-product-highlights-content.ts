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

async function migrateProductHighlightsContent() {
  const payload = (await getPayload({ config })) as PayloadWithPostgresPool
  const pool = payload.db?.pool

  if (!pool) {
    throw new Error('Postgres pool is not available on payload.db.')
  }

  const before = await pool.query<{
    legacy_count: string
    already_migrated_count: string
  }>(`
    SELECT
      COUNT(DISTINCT highlights."_parent_id")::text AS legacy_count,
      COUNT(DISTINCT products."id") FILTER (
        WHERE jsonb_typeof(products."highlights_content"->'root'->'children') = 'array'
          AND CASE
            WHEN jsonb_typeof(products."highlights_content"->'root'->'children') = 'array'
              THEN jsonb_array_length(products."highlights_content"->'root'->'children')
            ELSE 0
          END > 0
      )::text AS already_migrated_count
    FROM "products"
    LEFT JOIN "products_highlights" highlights
      ON highlights."_parent_id" = products."id"
      AND btrim(highlights."text") <> ''
  `)

  const result = await pool.query(`
    WITH legacy_highlights AS (
      SELECT
        "_parent_id" AS product_id,
        jsonb_agg(
          jsonb_build_object(
            'type', 'listitem',
            'value', item_index,
            'format', '',
            'indent', 0,
            'version', 1,
            'direction', 'ltr',
            'children', jsonb_build_array(
              jsonb_build_object(
                'type', 'text',
                'detail', 0,
                'format', 0,
                'mode', 'normal',
                'style', '',
                'text', item_text,
                'version', 1
              )
            )
          )
          ORDER BY item_order, item_id
        ) AS items
      FROM (
        SELECT
          "_parent_id",
          "_order" AS item_order,
          "id" AS item_id,
          row_number() OVER (PARTITION BY "_parent_id" ORDER BY "_order", "id") AS item_index,
          btrim("text") AS item_text
        FROM "products_highlights"
        WHERE btrim("text") <> ''
      ) normalized
      GROUP BY "_parent_id"
    ),
    lexical_documents AS (
      SELECT
        product_id,
        jsonb_build_object(
          'root',
          jsonb_build_object(
            'type', 'root',
            'children', jsonb_build_array(
              jsonb_build_object(
                'type', 'list',
                'listType', 'bullet',
                'tag', 'ul',
                'start', 1,
                'format', '',
                'indent', 0,
                'version', 1,
                'direction', 'ltr',
                'children', items
              )
            ),
            'direction', 'ltr',
            'format', '',
            'indent', 0,
            'version', 1
          )
        ) AS content
      FROM legacy_highlights
      WHERE jsonb_array_length(items) > 0
    )
    UPDATE "products" products
    SET "highlights_content" = lexical_documents.content
    FROM lexical_documents
    WHERE products."id" = lexical_documents.product_id
      AND (
        products."highlights_content" IS NULL
        OR CASE
          WHEN jsonb_typeof(products."highlights_content"->'root'->'children') = 'array'
            THEN jsonb_array_length(products."highlights_content"->'root'->'children')
          ELSE 0
        END = 0
      )
  `)

  const counts = before.rows[0]
  console.log(
    [
      'Product highlights content migration finished.',
      `legacyProducts=${counts?.legacy_count ?? '0'}`,
      `alreadyMigrated=${counts?.already_migrated_count ?? '0'}`,
      `migrated=${result.rowCount ?? 0}`,
    ].join(' '),
  )
}

migrateProductHighlightsContent()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
