import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

type LegacyHighlight = {
  text?: unknown
}

type ProductWithHighlights = {
  id: number | string
  highlights?: LegacyHighlight[] | null
  highlightsContent?: unknown
}

const BATCH_SIZE = 100

const hasLexicalContent = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const root = 'root' in value ? value.root : value
  if (!root || typeof root !== 'object' || !('children' in root) || !Array.isArray(root.children)) {
    return false
  }

  return root.children.length > 0
}

const normalizeHighlights = (highlights: ProductWithHighlights['highlights']) => {
  if (!Array.isArray(highlights)) {
    return []
  }

  return Array.from(
    new Set(
      highlights
        .map((entry) => (typeof entry?.text === 'string' ? entry.text.trim() : ''))
        .filter(Boolean),
    ),
  )
}

const createHighlightsLexicalDocument = (items: string[]) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'list',
        listType: 'bullet',
        tag: 'ul',
        start: 1,
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: items.map((text, index) => ({
          type: 'listitem',
          value: index + 1,
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          children: [
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
              version: 1,
            },
          ],
        })),
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

async function migrateProductHighlightsContent() {
  const payload = await getPayload({ config })
  let page = 1
  let scanned = 0
  let migrated = 0
  let skipped = 0

  while (true) {
    const result = await payload.find({
      collection: 'products',
      depth: 0,
      limit: BATCH_SIZE,
      page,
      overrideAccess: true,
    })

    const docs = result.docs as ProductWithHighlights[]
    if (docs.length === 0) {
      break
    }

    for (const product of docs) {
      scanned += 1

      if (hasLexicalContent(product.highlightsContent)) {
        skipped += 1
        continue
      }

      const highlights = normalizeHighlights(product.highlights)
      if (highlights.length === 0) {
        skipped += 1
        continue
      }

      await payload.update({
        collection: 'products',
        id: product.id,
        data: {
          highlightsContent: createHighlightsLexicalDocument(highlights),
        },
        depth: 0,
        overrideAccess: true,
      } as never)

      migrated += 1
    }

    if (!result.hasNextPage) {
      break
    }

    page += 1
  }

  console.log(`Product highlights content migration finished. scanned=${scanned} migrated=${migrated} skipped=${skipped}`)
}

migrateProductHighlightsContent()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
