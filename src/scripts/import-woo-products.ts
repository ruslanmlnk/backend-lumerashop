import 'dotenv/config'

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import { convertHtmlToLexicalDocument } from '../lib/html-to-lexical'
import config from '../payload.config'

type CSVRow = Record<string, string>

type NamedDoc = {
  id: number | string
  name?: string | null
  slug?: string | null
}

type CategoryDoc = NamedDoc

type CategoryGroupDoc = NamedDoc & {
  category?: number | string | { id?: number | string } | null
}

type SubcategoryDoc = NamedDoc & {
  categoryGroup?: number | string | { id?: number | string } | null
}

type FilterGroupDoc = NamedDoc

type FilterOptionDoc = NamedDoc & {
  group?: number | string | { id?: number | string } | null
}

type ProductDoc = {
  id: number | string
  slug?: string | null
}

type MediaDoc = {
  id: number | string
  filename?: string | null
}

type ImportSummary = {
  createdProducts: number
  updatedProducts: number
  draftProducts: number
  publishedProducts: number
  createdMedia: number
  createdFilterGroups: number
  createdFilterOptions: number
  skippedRows: number
}

type ImageEntry = {
  url: string
  alt: string
}

type FilterDefinition = {
  column: string
  groupName: string
}

const WORKSPACE_ROOT = path.resolve(process.cwd(), '..')
const DEFAULT_CSV_BASENAME = 'product-export-2026-03-15-03-44-34.csv'
const TEMP_DIR = path.join(process.cwd(), '.woo-import-cache')

const FILTER_DEFINITIONS: FilterDefinition[] = [
  { column: 'attribute:pa_barva', groupName: 'Barva' },
  { column: 'attribute:pa_material', groupName: 'Materiál' },
  { column: 'attribute:pa_druhy-kabelek', groupName: 'Druh kabelky' },
  { column: 'attribute:pa_druhy-panskych-tasek', groupName: 'Druh pánské tašky' },
  { column: 'attribute:pa_kovani', groupName: 'Kování' },
  { column: 'attribute:pa_max-delka-pasku', groupName: 'Max. délka pásku' },
  { column: 'attribute:pa_podsivka', groupName: 'Podšívka' },
  { column: 'attribute:pa_urceni', groupName: 'Určení' },
]

const HTML_ENTITY_REPLACEMENTS: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&times;': '×',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '...',
}

const normalizeLabel = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const titleCase = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  return trimmed.charAt(0).toLocaleUpperCase('cs-CZ') + trimmed.slice(1)
}

const decodeHtmlEntities = (value: string) =>
  value.replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;|&times;|&ndash;|&mdash;|&hellip;/g, (match) => {
    return HTML_ENTITY_REPLACEMENTS[match] ?? match
  })

const stripHtml = (value: string) => {
  const withLineBreaks = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, ' ')
  const decoded = decodeHtmlEntities(withoutTags)

  return decoded
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

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

const splitMultiValue = (value: string) =>
  value
    .split('|')
    .map((entry) => cleanString(entry))
    .filter(Boolean)

const parseNumber = (value: string) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

const parseInteger = (value: string) => {
  const numeric = parseNumber(value)
  return typeof numeric === 'number' ? Math.trunc(numeric) : undefined
}

const parseImageEntries = (value: string, fallbackAlt: string): ImageEntry[] => {
  if (!value.trim()) {
    return []
  }

  return value
    .split(/\s+\|\s+/)
    .map((entry) => {
      const segments = entry.split(/\s+!\s+/)
      const url = cleanString(segments[0])

      if (!url) {
        return null
      }

      let alt = fallbackAlt

      for (const segment of segments.slice(1)) {
        const [rawKey, ...rawValue] = segment.split(/\s*:\s*/)
        const key = cleanString(rawKey).toLowerCase()
        const parsedValue = cleanString(rawValue.join(':'))

        if (key === 'alt' && parsedValue) {
          alt = parsedValue
        }
      }

      return {
        url,
        alt: alt || fallbackAlt,
      } satisfies ImageEntry
    })
    .filter((entry): entry is ImageEntry => Boolean(entry))
}

const extractRelationId = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') {
    return value
  }

  if (typeof value === 'object' && value !== null && 'id' in value) {
    const relationId = value.id
    return typeof relationId === 'number' || typeof relationId === 'string' ? relationId : undefined
  }

  return undefined
}

const getCategoryFromRow = (row: CSVRow) => {
  const normalizedCategories = splitMultiValue(row['tax:product_cat']).map((entry) => normalizeLabel(entry))
  const normalizedName = normalizeLabel(cleanString(row.post_title))

  const has = (needle: string) => normalizedCategories.some((entry) => entry.includes(needle))
  const womensBagTypes = splitMultiValue(row['attribute:pa_druhy-kabelek'])
  const mensBagTypes = splitMultiValue(row['attribute:pa_druhy-panskych-tasek'])

  if (has('doplnky') || has('penezenky') || has('opasky')) {
    return 'Doplňky'
  }

  if (has('batohy panske batohy') || has('batohy zenske batohy') || has('batohy')) {
    return 'Batohy'
  }

  if (mensBagTypes.length > 0 || has('panske tasky')) {
    return 'Pánské tašky'
  }

  if (womensBagTypes.length > 0 || has('damske kabelky')) {
    return 'Dámské kabelky'
  }

  if (has('akce')) {
    return 'Akce'
  }

  if (normalizedName.includes('batoh')) {
    return 'Batohy'
  }

  if (normalizedName.includes('penezenk') || normalizedName.includes('pasek')) {
    return 'Doplňky'
  }

  if (normalizedName.includes('kabelk')) {
    return 'Dámské kabelky'
  }

  if (normalizedName.includes('taska')) {
    return mensBagTypes.length > 0 ? 'Pánské tašky' : 'Dámské kabelky'
  }

  return undefined
}

const getPrimaryGroupAndSubcategory = (
  row: CSVRow,
  categoryName: string | undefined,
): { groupName?: string; subcategoryName?: string } => {
  const categories = splitMultiValue(row['tax:product_cat']).map((entry) => normalizeLabel(entry))
  const womensTypes = splitMultiValue(row['attribute:pa_druhy-kabelek'])
  const mensTypes = splitMultiValue(row['attribute:pa_druhy-panskych-tasek'])

  if (categoryName === 'Doplňky') {
    if (categories.some((entry) => entry.includes('penezenky'))) {
      const isMens = categories.some((entry) => entry.includes('panske penezenky'))
      return {
        groupName: 'Peněženky',
        subcategoryName: isMens ? 'Pánské peněženky' : 'Dámské peněženky',
      }
    }

    if (categories.some((entry) => entry.includes('opasky'))) {
      return {
        groupName: 'Opasky',
        subcategoryName: 'Dámské opasky',
      }
    }
  }

  if (categoryName === 'Batohy') {
    if (categories.some((entry) => entry.includes('panske batohy'))) {
      return { groupName: 'Pánské batohy' }
    }

    if (categories.some((entry) => entry.includes('zenske batohy'))) {
      return { groupName: 'Dámské batohy' }
    }
  }

  if (categoryName === 'Dámské kabelky' && womensTypes.length > 0) {
    return {
      groupName: 'Podle druhu',
      subcategoryName: titleCase(womensTypes[0] || ''),
    }
  }

  if (categoryName === 'Pánské tašky' && mensTypes.length > 0) {
    return {
      groupName: 'Podle druhu',
      subcategoryName: titleCase(mensTypes[0] || ''),
    }
  }

  return {}
}

const formatSpecificationValue = (value: string) => cleanString(value)

const buildSpecifications = (row: CSVRow) => {
  const specs: Array<{ key: string; value: string }> = []
  const push = (key: string, value: string | undefined) => {
    const normalizedValue = value ? formatSpecificationValue(value) : ''
    if (!normalizedValue) {
      return
    }

    specs.push({ key, value: normalizedValue })
  }

  const length = cleanString(row.length)
  const width = cleanString(row.width)
  const height = cleanString(row.height)

  if (length || width || height) {
    const dimensions = [length, width, height].filter(Boolean).join(' × ')
    if (dimensions) {
      push('Rozměry', `${dimensions} cm`)
    }
  }

  if (cleanString(row.weight)) {
    push('Hmotnost', `${cleanString(row.weight)} kg`)
  }

  const attributeLabels: Record<string, string> = {
    'attribute:pa_barva': 'Barva',
    'attribute:pa_material': 'Materiál',
    'attribute:pa_kovani': 'Kování',
    'attribute:pa_podsivka': 'Podšívka',
    'attribute:pa_max-delka-pasku': 'Max. délka pásku',
    'attribute:pa_urceni': 'Určení',
  }

  for (const [column, label] of Object.entries(attributeLabels)) {
    const values = splitMultiValue(row[column]).map((value) => titleCase(value))
    if (values.length > 0) {
      push(label, values.join(', '))
    }
  }

  return specs
}

const buildHighlights = (row: CSVRow) => {
  const excerpt = cleanString(row.post_excerpt)
  if (!excerpt) {
    return []
  }

  const highlights = Array.from(excerpt.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((match) => stripHtml(match[1] || ''))
    .map((entry) => entry.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  return Array.from(new Set(highlights)).slice(0, 8)
}

const resolveShortDescription = (row: CSVRow) => {
  const excerptText = stripHtml(cleanString(row.post_excerpt))
  if (excerptText) {
    return truncate(excerptText, 400)
  }

  return truncate(stripHtml(cleanString(row.post_content)), 400)
}

const resolveDescriptionContent = (row: CSVRow) => {
  const html = cleanString(row.post_content)

  if (!stripHtml(html)) {
    return undefined
  }

  return convertHtmlToLexicalDocument(html)
}

const getProductStatus = (wooStatus: string) => {
  return normalizeLabel(wooStatus) === 'publikovano' ? 'published' : 'draft'
}

const getStockStatus = (row: CSVRow): 'in-stock' | 'low-stock' | 'out-of-stock' => {
  const rawStatus = normalizeLabel(cleanString(row.stock_status))
  const quantity = parseInteger(cleanString(row.stock))

  if (rawStatus === 'outofstock') {
    return 'out-of-stock'
  }

  if (quantity != null) {
    if (quantity <= 0) {
      return 'out-of-stock'
    }

    if (quantity <= 3) {
      return 'low-stock'
    }
  }

  return 'in-stock'
}

const resolvePrice = (row: CSVRow) => {
  const regularPrice = parseNumber(cleanString(row.regular_price)) ?? 0
  const salePrice = parseNumber(cleanString(row.sale_price))

  if (typeof salePrice === 'number' && salePrice > 0 && salePrice < regularPrice) {
    return {
      discountPrice: salePrice,
      discountType: 'price' as const,
      price: regularPrice,
    }
  }

  return {
    price: regularPrice,
    discountPrice: undefined,
    discountType: undefined,
  }
}

const hashString = (value: string) => createHash('sha1').update(value).digest('hex')

const getCachedImageFilename = (url: string) => {
  const parsedUrl = new URL(url)
  const extension = path.extname(parsedUrl.pathname) || '.bin'
  return `${hashString(url)}${extension}`
}

const getDefaultCSVPath = () => {
  const exactPath = path.join(WORKSPACE_ROOT, DEFAULT_CSV_BASENAME)
  if (existsSync(exactPath)) {
    return exactPath
  }

  throw new Error(`Could not find default CSV at ${exactPath}`)
}

const buildFallbackProductSlug = (slug: string, sku: string, rowIndex: number) => {
  const normalizedSku = normalizeLabel(sku).replace(/\s+/g, '-')
  const suffix = normalizedSku || `woo-${rowIndex + 1}`
  return `${slug}-${suffix}`
}

const createProductWithData = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  data: Record<string, unknown>,
) => {
  return (await payload.create({
    collection: 'products',
    data,
    depth: 0,
    overrideAccess: true,
  } as never)) as unknown as ProductDoc
}

const buildFilterOptionSlug = (groupName: string, optionName: string) => {
  const normalizedGroup = normalizeLabel(groupName).replace(/\s+/g, '-')
  const normalizedOption = normalizeLabel(optionName).replace(/\s+/g, '-')
  return `${normalizedGroup}-${normalizedOption}`
}

const readCSVRows = async (csvPath: string) => {
  const content = await readFile(csvPath, 'utf8')
  return parseCSV(content)
}

async function importWooProducts() {
  const csvPathArg = process.argv[2]
  const targetSlugArg = cleanString(process.argv[3])
  const csvPath = csvPathArg ? path.resolve(process.cwd(), csvPathArg) : getDefaultCSVPath()

  const payload = await getPayload({ config })
  const rows = await readCSVRows(csvPath)

  await mkdir(TEMP_DIR, { recursive: true })

  const summary: ImportSummary = {
    createdProducts: 0,
    updatedProducts: 0,
    draftProducts: 0,
    publishedProducts: 0,
    createdMedia: 0,
    createdFilterGroups: 0,
    createdFilterOptions: 0,
    skippedRows: 0,
  }

  const imagePathCache = new Map<string, string>()
  const mediaIdCache = new Map<string, number | string>()
  const mediaFilenameCache = new Map<string, number | string>()
  const filterGroupCache = new Map<string, FilterGroupDoc>()
  const filterOptionCache = new Map<string, FilterOptionDoc>()
  const productCache = new Map<string, ProductDoc>()

  const categoriesResult = await payload.find({
    collection: 'categories',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  } as never)
  const categoryGroupsResult = await payload.find({
    collection: 'category-groups',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  } as never)
  const subcategoriesResult = await payload.find({
    collection: 'subcategories',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  } as never)
  const existingFilterGroups = await payload.find({
    collection: 'filter-groups',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  } as never)
  const existingFilterOptions = await payload.find({
    collection: 'filter-options',
    depth: 0,
    limit: 2000,
    overrideAccess: true,
    pagination: false,
  } as never)
  const existingProducts = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  } as never)
  const existingMedia = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 2000,
    overrideAccess: true,
    pagination: false,
  } as never)

  const categories = (categoriesResult.docs as CategoryDoc[]) ?? []
  const categoryGroups = (categoryGroupsResult.docs as CategoryGroupDoc[]) ?? []
  const subcategories = (subcategoriesResult.docs as SubcategoryDoc[]) ?? []

  const categoriesByName = new Map<string, CategoryDoc>()
  for (const category of categories) {
    const name = cleanString(category.name)
    if (name) {
      categoriesByName.set(normalizeLabel(name), category)
    }
  }

  const categoryGroupsByKey = new Map<string, CategoryGroupDoc>()
  for (const group of categoryGroups) {
    const groupName = cleanString(group.name)
    const categoryId = extractRelationId(group.category)
    if (!groupName || categoryId == null) {
      continue
    }

    categoryGroupsByKey.set(`${String(categoryId)}:${normalizeLabel(groupName)}`, group)
  }

  const subcategoriesByKey = new Map<string, SubcategoryDoc>()
  for (const subcategory of subcategories) {
    const subcategoryName = cleanString(subcategory.name)
    const groupId = extractRelationId(subcategory.categoryGroup)
    if (!subcategoryName || groupId == null) {
      continue
    }

    subcategoriesByKey.set(`${String(groupId)}:${normalizeLabel(subcategoryName)}`, subcategory)
  }

  for (const filterGroup of (existingFilterGroups.docs as FilterGroupDoc[]) ?? []) {
    const name = cleanString(filterGroup.name)
    if (!name) {
      continue
    }

    filterGroupCache.set(normalizeLabel(name), filterGroup)
  }

  for (const filterOption of (existingFilterOptions.docs as FilterOptionDoc[]) ?? []) {
    const optionName = cleanString(filterOption.name)
    const groupId = extractRelationId(filterOption.group)
    if (!optionName || groupId == null) {
      continue
    }

    filterOptionCache.set(`${String(groupId)}:${normalizeLabel(optionName)}`, filterOption)
  }

  for (const product of (existingProducts.docs as ProductDoc[]) ?? []) {
    const slug = cleanString(product.slug)
    if (slug) {
      productCache.set(slug, product)
    }
  }

  for (const media of (existingMedia.docs as MediaDoc[]) ?? []) {
    const filename = cleanString(media.filename)
    if (!filename) {
      continue
    }

    mediaFilenameCache.set(filename, media.id)
  }

  const upsertFilterGroup = async (name: string) => {
    const key = normalizeLabel(name)
    const cached = filterGroupCache.get(key)
    if (cached) {
      return cached
    }

    const created = (await payload.create({
      collection: 'filter-groups',
      data: {
        name,
        isActive: true,
      },
      depth: 0,
      overrideAccess: true,
    } as never)) as unknown as FilterGroupDoc

    filterGroupCache.set(key, created)
    summary.createdFilterGroups += 1
    return created
  }

  const upsertFilterOption = async (group: FilterGroupDoc, name: string) => {
    const groupId = group.id
    const key = `${String(groupId)}:${normalizeLabel(name)}`
    const cached = filterOptionCache.get(key)
    if (cached) {
      return cached
    }

    let created: FilterOptionDoc

    try {
      created = (await payload.create({
        collection: 'filter-options',
        data: {
          name,
          group: groupId,
          isActive: true,
        },
        depth: 0,
        overrideAccess: true,
      } as never)) as unknown as FilterOptionDoc
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown filter option error.'

      if (!/slug/i.test(message)) {
        throw error
      }

      created = (await payload.create({
        collection: 'filter-options',
        data: {
          name,
          generateSlug: false,
          slug: buildFilterOptionSlug(cleanString(group.name), name),
          group: groupId,
          isActive: true,
        },
        depth: 0,
        overrideAccess: true,
      } as never)) as unknown as FilterOptionDoc
    }

    filterOptionCache.set(key, created)
    summary.createdFilterOptions += 1
    return created
  }

  const downloadImage = async (url: string) => {
    const cached = imagePathCache.get(url)
    if (cached) {
      return cached
    }

    const response = await fetch(url, {
      headers: {
        'user-agent': 'Lumera Woo Import/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download ${url} (${response.status})`)
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer())
    const filePath = path.join(TEMP_DIR, getCachedImageFilename(url))

    await writeFile(filePath, imageBuffer)
    imagePathCache.set(url, filePath)

    return filePath
  }

  const createMediaFromUrl = async (image: ImageEntry, fallbackAlt: string) => {
    const cached = mediaIdCache.get(image.url)
    if (cached != null) {
      return cached
    }

    const cachedByFilename = mediaFilenameCache.get(getCachedImageFilename(image.url))
    if (cachedByFilename != null) {
      mediaIdCache.set(image.url, cachedByFilename)
      return cachedByFilename
    }

    const filePath = await downloadImage(image.url)
    const created = (await payload.create({
      collection: 'media',
      data: {
        alt: image.alt || fallbackAlt,
      },
      depth: 0,
      filePath,
      overrideAccess: true,
    } as never)) as unknown as MediaDoc

    mediaIdCache.set(image.url, created.id)
    mediaFilenameCache.set(getCachedImageFilename(image.url), created.id)
    summary.createdMedia += 1

    return created.id
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    const productName = cleanString(row.post_title)
    const slug = cleanString(row.post_name)

    if (targetSlugArg && slug !== targetSlugArg) {
      continue
    }

    if (!productName || !slug) {
      summary.skippedRows += 1
      console.warn(`Skipping row ${index + 2}: missing product name or slug.`)
      continue
    }

    const categoryName = getCategoryFromRow(row)
    const categoryDoc = categoryName ? categoriesByName.get(normalizeLabel(categoryName)) : undefined

    if (!categoryDoc) {
      summary.skippedRows += 1
      console.warn(`Skipping ${slug}: could not map category from Woo categories "${row['tax:product_cat']}".`)
      continue
    }

    const imageEntries = parseImageEntries(cleanString(row.images), productName)

    if (imageEntries.length === 0) {
      summary.skippedRows += 1
      console.warn(`Skipping ${slug}: no image URLs found.`)
      continue
    }

    try {
      const mainImageId = await createMediaFromUrl(imageEntries[0], productName)
      const galleryIds: Array<{ image: number | string }> = []

      for (const image of imageEntries.slice(1)) {
        const imageId = await createMediaFromUrl(image, productName)
        galleryIds.push({ image: imageId })
      }

      const { groupName, subcategoryName } = getPrimaryGroupAndSubcategory(row, categoryName)
      const categoryGroupDoc =
        groupName != null
          ? categoryGroupsByKey.get(`${String(categoryDoc.id)}:${normalizeLabel(groupName)}`)
          : undefined
      const primarySubcategoryDoc =
        categoryGroupDoc && subcategoryName
          ? subcategoriesByKey.get(`${String(categoryGroupDoc.id)}:${normalizeLabel(subcategoryName)}`)
          : undefined

      const filterOptionIds: Array<number | string> = []
      for (const definition of FILTER_DEFINITIONS) {
        const values = splitMultiValue(cleanString(row[definition.column])).map((value) => titleCase(value))

        if (values.length === 0) {
          continue
        }

        const filterGroup = await upsertFilterGroup(definition.groupName)

        for (const value of values) {
          const option = await upsertFilterOption(filterGroup, value)
          filterOptionIds.push(option.id)
        }
      }

      const uniqueFilterOptionIds = Array.from(
        new Map(filterOptionIds.map((value) => [String(value), value])).values(),
      )
      const { discountPrice, discountType, price } = resolvePrice(row)
      const highlights = buildHighlights(row)
      const specifications = buildSpecifications(row)
      const shortDescription = resolveShortDescription(row)
      const descriptionContent = resolveDescriptionContent(row)
      const purchaseCount = parseInteger(cleanString(row['meta:total_sales'])) ?? 0
      const status = getProductStatus(cleanString(row.post_status))
      const existingProduct = productCache.get(slug)
      const sku = cleanString(row.sku)

      const productData = {
        name: productName,
        generateSlug: false,
        slug,
        price,
        discountPrice,
        discountType,
        sku: sku || undefined,
        stockQuantity: parseInteger(cleanString(row.stock)) ?? 0,
        purchaseCount,
        stockStatus: getStockStatus(row),
        shortDescription: shortDescription || undefined,
        descriptionContent,
        category: categoryDoc.id,
        categoryGroup: categoryGroupDoc?.id,
        subcategories: primarySubcategoryDoc ? [primarySubcategoryDoc.id] : [],
        mainImage: mainImageId,
        gallery: galleryIds,
        highlights: highlights.map((entry) => ({ text: entry })),
        specifications,
        filterOptions: uniqueFilterOptionIds,
        status,
        isFeatured: false,
        isRecommended: false,
      }

      if (existingProduct) {
        await payload.update({
          collection: 'products',
          id: existingProduct.id,
          data: productData,
          depth: 0,
          overrideAccess: true,
        } as never)

        summary.updatedProducts += 1
      } else {
        try {
          const created = await createProductWithData(payload, productData)

          productCache.set(slug, created)
          summary.createdProducts += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown import error.'
          const simplifiedProductData = {
            ...productData,
            categoryGroup: undefined,
            subcategories: [],
            filterOptions: [],
          }

          try {
            const created = await createProductWithData(payload, simplifiedProductData)

            productCache.set(slug, created)
            summary.createdProducts += 1
            console.warn(`Created ${productName} with simplified category/filter mapping.`)
          } catch (simplifiedError) {
            const fallbackMessage =
              simplifiedError instanceof Error ? simplifiedError.message : 'Unknown import error.'

            if (!/slug/i.test(fallbackMessage)) {
              throw simplifiedError
            }

            const fallbackSlug = buildFallbackProductSlug(slug, sku, index)
            const created = await createProductWithData(payload, {
              ...simplifiedProductData,
              slug: fallbackSlug,
            })

            productCache.set(fallbackSlug, created)
            summary.createdProducts += 1
            console.warn(
              `Created ${productName} with simplified mapping and fallback slug "${fallbackSlug}". Original error: ${message}`,
            )
          }
        }
      }

      if (status === 'published') {
        summary.publishedProducts += 1
      } else {
        summary.draftProducts += 1
      }

      if ((index + 1) % 10 === 0 || index === rows.length - 1) {
        console.log(`Imported ${index + 1}/${rows.length} rows...`)
      }
    } catch (error) {
      summary.skippedRows += 1
      const message = error instanceof Error ? error.message : 'Unknown import error.'
      console.error(`Failed importing ${slug}: ${message}`)

       if (targetSlugArg) {
        console.error(error)
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        csvPath,
        rows: rows.length,
        ...summary,
      },
      null,
      2,
    ),
  )
}

importWooProducts()
  .then(async () => {
    await rm(TEMP_DIR, { recursive: true, force: true })
    process.exit(0)
  })
  .catch(async (error) => {
    console.error(error)
    await rm(TEMP_DIR, { recursive: true, force: true })
    process.exit(1)
  })
