import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../payload.config'
import { createLexicalRichTextFromText } from '../../../frontend/lib/payload-richtext'

type ProductDoc = {
  id: number | string
  description?: string | null
  descriptionContent?: unknown
  slug?: string | null
}

const hasRichTextContent = (value: unknown) =>
  typeof value === 'object' && value !== null && 'root' in (value as Record<string, unknown>)

async function main() {
  const payload = await getPayload({ config })
  const products = await payload.find({
    collection: 'products',
    limit: 500,
    depth: 0,
  })

  let updatedCount = 0
  let skippedCount = 0

  for (const doc of products.docs as ProductDoc[]) {
    if (hasRichTextContent(doc.descriptionContent) || typeof doc.description !== 'string' || !doc.description.trim()) {
      skippedCount += 1
      continue
    }

    await payload.update({
      collection: 'products',
      id: doc.id,
      data: {
        descriptionContent: createLexicalRichTextFromText(doc.description),
      },
    })

    updatedCount += 1
    console.log(`Backfilled Popis tab for ${doc.slug || doc.id}`)
  }

  console.log(`Product description rich text backfill complete. Updated: ${updatedCount}, Skipped: ${skippedCount}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Product description rich text backfill failed:', error)
    process.exit(1)
  })
