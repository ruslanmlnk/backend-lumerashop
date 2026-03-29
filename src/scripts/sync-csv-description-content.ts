import 'dotenv/config'

import path from 'node:path'
import { readFile } from 'node:fs/promises'

import { getPayload } from 'payload'

import config from '../payload.config'
import { convertHtmlToLexicalDocument } from '../lib/html-to-lexical'

type CSVRow = Record<string, string>

type ProductDoc = {
  id: number | string
  slug?: string | null
  sku?: string | null
  name?: string | null
}

type Summary = {
  totalRows: number
  matchedBySlug: number
  matchedBySku: number
  updatedProducts: number
  skippedEmptyHtml: number
  missingProducts: number
}

const WORKSPACE_ROOT = path.resolve(process.cwd(), '..')
const DEFAULT_CSV_BASENAME = 'product-export-2026-03-15-03-44-34.csv'

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

const getDefaultCSVPath = () => path.join(WORKSPACE_ROOT, DEFAULT_CSV_BASENAME)

const readCSVRows = async (csvPath: string) => {
  const content = await readFile(csvPath, 'utf8')
  return parseCSV(content)
}

async function syncCsvDescriptionContent() {
  const csvPathArg = cleanString(process.argv[2])
  const dryRun = process.argv.includes('--dry-run')
  const csvPath = csvPathArg ? path.resolve(process.cwd(), csvPathArg) : getDefaultCSVPath()

  const payload = await getPayload({ config })
  const rows = await readCSVRows(csvPath)

  const productsResult = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 2000,
    overrideAccess: true,
    pagination: false,
  } as never)

  const products = ((productsResult as { docs?: ProductDoc[] }).docs ?? []) as ProductDoc[]
  const productsBySlug = new Map<string, ProductDoc>()
  const productsBySku = new Map<string, ProductDoc>()

  for (const product of products) {
    const slug = cleanString(product.slug)
    const sku = cleanString(product.sku)

    if (slug) {
      productsBySlug.set(slug, product)
    }

    if (sku && !productsBySku.has(sku)) {
      productsBySku.set(sku, product)
    }
  }

  const summary: Summary = {
    totalRows: rows.length,
    matchedBySlug: 0,
    matchedBySku: 0,
    updatedProducts: 0,
    skippedEmptyHtml: 0,
    missingProducts: 0,
  }

  const updatedProductIds = new Set<string>()
  const missing: Array<{ slug: string; sku: string; name: string }> = []

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

    if (updatedProductIds.has(String(product.id))) {
      continue
    }

    if (matchSource === 'slug') {
      summary.matchedBySlug += 1
    } else {
      summary.matchedBySku += 1
    }

    const descriptionContent = convertHtmlToLexicalDocument(html)

    if (!dryRun) {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: {
          descriptionContent,
        },
        depth: 0,
        overrideAccess: true,
      } as never)
    }

    updatedProductIds.add(String(product.id))
    summary.updatedProducts += 1
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        csvPath,
        ...summary,
        missingPreview: missing.slice(0, 20),
      },
      null,
      2,
    ),
  )
}

syncCsvDescriptionContent()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
