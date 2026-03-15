import 'dotenv/config'

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../payload.config'

type CSVRow = Record<string, string>

type ProductDoc = {
  id: number | string
  slug?: string | null
}

type SyncSummary = {
  csvPath: string
  rows: number
  matchedProducts: number
  updatedProducts: number
  clearedProducts: number
  productsWithVariants: number
  totalVariantLinks: number
  productsWithoutPayloadMatch: number
  unresolvedLinkedIds: number
  skippedRows: number
}

const WORKSPACE_ROOT = path.resolve(process.cwd(), '..')
const DEFAULT_CSV_BASENAME = 'product-export-2026-03-15-03-44-34.csv'

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

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
  if (!headerRow || headerRow.length === 0) {
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

const splitLinkedIds = (value: string) =>
  value
    .split(/[|,]/)
    .map((entry) => cleanString(entry))
    .filter(Boolean)

const uniqueValues = <T extends number | string>(values: T[]) =>
  Array.from(new Map(values.map((value) => [String(value), value])).values())

const getDefaultCSVPath = () => {
  const exactPath = path.join(WORKSPACE_ROOT, DEFAULT_CSV_BASENAME)
  if (existsSync(exactPath)) {
    return exactPath
  }

  throw new Error(`Could not find default CSV at ${exactPath}`)
}

const readCSVRows = async (csvPath: string) => {
  const content = await readFile(csvPath, 'utf8')
  return parseCSV(content)
}

async function syncWooVariantProducts() {
  const csvPathArg = process.argv[2]
  const targetSlugArg = cleanString(process.argv[3])
  const csvPath = csvPathArg ? path.resolve(process.cwd(), csvPathArg) : getDefaultCSVPath()

  if (!existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`)
  }

  const payload = await getPayload({ config })
  const rows = await readCSVRows(csvPath)

  const existingProducts = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  } as never)

  const productsBySlug = new Map<string, ProductDoc>()
  for (const product of (existingProducts.docs as ProductDoc[]) ?? []) {
    const slug = cleanString(product.slug)
    if (slug) {
      productsBySlug.set(slug, product)
    }
  }

  const rowsByWooId = new Map<string, CSVRow>()
  for (const row of rows) {
    const wooId = cleanString(row.ID)
    const slug = cleanString(row.post_name)

    if (wooId && slug) {
      rowsByWooId.set(wooId, row)
    }
  }

  const summary: SyncSummary = {
    csvPath,
    rows: rows.length,
    matchedProducts: 0,
    updatedProducts: 0,
    clearedProducts: 0,
    productsWithVariants: 0,
    totalVariantLinks: 0,
    productsWithoutPayloadMatch: 0,
    unresolvedLinkedIds: 0,
    skippedRows: 0,
  }

  for (const row of rows) {
    const wooId = cleanString(row.ID)
    const slug = cleanString(row.post_name)

    if (!wooId || !slug) {
      summary.skippedRows += 1
      continue
    }

    if (targetSlugArg && slug !== targetSlugArg) {
      continue
    }

    const currentProduct = productsBySlug.get(slug)
    if (!currentProduct) {
      summary.productsWithoutPayloadMatch += 1
      continue
    }

    summary.matchedProducts += 1

    const linkedProductIds = splitLinkedIds(cleanString(row.upsell_ids))
    const variantProducts: Array<number | string> = []

    for (const linkedWooId of linkedProductIds) {
      if (linkedWooId === wooId) {
        continue
      }

      const linkedRow = rowsByWooId.get(linkedWooId)
      const linkedSlug = cleanString(linkedRow?.post_name)
      const linkedProduct = linkedSlug ? productsBySlug.get(linkedSlug) : undefined

      if (!linkedProduct) {
        summary.unresolvedLinkedIds += 1
        continue
      }

      if (String(linkedProduct.id) === String(currentProduct.id)) {
        continue
      }

      variantProducts.push(linkedProduct.id)
    }

    const uniqueVariantProducts = uniqueValues(variantProducts)

    await payload.update({
      collection: 'products',
      id: currentProduct.id,
      data: {
        variantProducts: uniqueVariantProducts,
      },
      depth: 0,
      overrideAccess: true,
    } as never)

    summary.updatedProducts += 1
    summary.totalVariantLinks += uniqueVariantProducts.length

    if (uniqueVariantProducts.length > 0) {
      summary.productsWithVariants += 1
    } else {
      summary.clearedProducts += 1
    }
  }

  console.log(
    JSON.stringify(
      {
        sourceField: 'upsell_ids',
        ...summary,
      },
      null,
      2,
    ),
  )
}

syncWooVariantProducts()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
