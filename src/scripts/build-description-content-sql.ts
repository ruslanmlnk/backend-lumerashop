import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'

import { convertHtmlToLexicalDocument } from '../lib/html-to-lexical'

type CSVRow = Record<string, string>

type ProductMapRow = {
  id: string
  slug: string
  sku: string
  name: string
}

type Summary = {
  totalRows: number
  matchedBySlug: number
  matchedBySku: number
  updatesWritten: number
  skippedEmptyHtml: number
  missingProducts: number
}

const WORKSPACE_ROOT = path.resolve(process.cwd(), '..')
const DEFAULT_CSV_BASENAME = 'product-export-2026-03-15-03-44-34.csv'
const DEFAULT_PRODUCT_MAP_BASENAME = '.tmp-product-map.psv'
const DEFAULT_SQL_BASENAME = '.tmp-description-content-update.sql'

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const stripHtmlForCheck = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()

const parseCSV = (content: string): CSVRow[] => {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  const input = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    const next = input[index + 1]

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          currentField += '"'
          index += 1
        } else {
          inQuotes = false
        }

        continue
      }

      currentField += char
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      currentRow.push(currentField)
      currentField = ''
      continue
    }

    if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') {
        index += 1
      }

      currentRow.push(currentField)
      rows.push(currentRow)
      currentRow = []
      currentField = ''
      continue
    }

    currentField += char
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  const [headerRow, ...dataRows] = rows
  if (!headerRow?.length) {
    return []
  }

  return dataRows
    .filter((row) => row.some((value) => value.trim().length > 0))
    .map((row) => {
      const record: CSVRow = {}

      for (let columnIndex = 0; columnIndex < headerRow.length; columnIndex += 1) {
        const key = headerRow[columnIndex] ?? ''
        record[key] = row[columnIndex] ?? ''
      }

      return record
    })
}

const parseProductMap = (content: string): ProductMapRow[] => {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id = '', slug = '', sku = '', ...nameParts] = line.split('|')

      return {
        id: cleanString(id),
        slug: cleanString(slug),
        sku: cleanString(sku),
        name: cleanString(nameParts.join('|')),
      }
    })
    .filter((row) => Boolean(row.id))
}

const escapeSqlString = (value: string) => value.replace(/'/g, "''")

async function buildDescriptionContentSql() {
  const csvPathArg = cleanString(process.argv[2])
  const productMapPathArg = cleanString(process.argv[3])
  const outputPathArg = cleanString(process.argv[4])

  const csvPath = csvPathArg
    ? path.resolve(process.cwd(), csvPathArg)
    : path.join(WORKSPACE_ROOT, DEFAULT_CSV_BASENAME)
  const productMapPath = productMapPathArg
    ? path.resolve(process.cwd(), productMapPathArg)
    : path.join(process.cwd(), DEFAULT_PRODUCT_MAP_BASENAME)
  const outputPath = outputPathArg
    ? path.resolve(process.cwd(), outputPathArg)
    : path.join(process.cwd(), DEFAULT_SQL_BASENAME)

  const [csvContent, productMapContent] = await Promise.all([
    readFile(csvPath, 'utf8'),
    readFile(productMapPath, 'utf8'),
  ])

  const rows = parseCSV(csvContent)
  const productMap = parseProductMap(productMapContent)
  const productsBySlug = new Map<string, ProductMapRow>()
  const productsBySku = new Map<string, ProductMapRow>()

  for (const product of productMap) {
    if (product.slug) {
      productsBySlug.set(product.slug, product)
    }

    if (product.sku && !productsBySku.has(product.sku)) {
      productsBySku.set(product.sku, product)
    }
  }

  const summary: Summary = {
    totalRows: rows.length,
    matchedBySlug: 0,
    matchedBySku: 0,
    updatesWritten: 0,
    skippedEmptyHtml: 0,
    missingProducts: 0,
  }

  const missing: Array<{ slug: string; sku: string; name: string }> = []
  const updatedIds = new Set<string>()
  const statements: string[] = ['begin;']

  for (const row of rows) {
    const slug = cleanString(row.post_name)
    const sku = cleanString(row.sku)
    const name = cleanString(row.post_title)
    const html = cleanString(row.post_content)

    if (!stripHtmlForCheck(html)) {
      summary.skippedEmptyHtml += 1
      continue
    }

    let product = slug ? productsBySlug.get(slug) : undefined
    let matchSource: 'slug' | 'sku' | null = product ? 'slug' : null

    if (!product && sku) {
      product = productsBySku.get(sku)
      matchSource = product ? 'sku' : null
    }

    if (!product || !matchSource) {
      summary.missingProducts += 1
      missing.push({ slug, sku, name })
      continue
    }

    if (updatedIds.has(product.id)) {
      continue
    }

    const descriptionContent = JSON.stringify(convertHtmlToLexicalDocument(html))
    statements.push(
      `update public.products set description_content = '${escapeSqlString(descriptionContent)}'::jsonb where id = ${product.id};`,
    )

    updatedIds.add(product.id)
    summary.updatesWritten += 1

    if (matchSource === 'slug') {
      summary.matchedBySlug += 1
    } else {
      summary.matchedBySku += 1
    }
  }

  statements.push('commit;')

  await writeFile(outputPath, `${statements.join('\n')}\n`, 'utf8')

  console.log(
    JSON.stringify(
      {
        csvPath,
        productMapPath,
        outputPath,
        ...summary,
        missingPreview: missing.slice(0, 20),
      },
      null,
      2,
    ),
  )
}

buildDescriptionContentSql()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
