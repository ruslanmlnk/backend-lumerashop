import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

import config from '../payload.config'
import { ALL_PRODUCTS } from '../../../frontend/data/site-data'

type PayloadInstance = Awaited<ReturnType<typeof getPayload>>

type MediaUploadCreateArgs = Parameters<PayloadInstance['create']>[0] & {
  file: {
    data: Buffer
    mimetype: string
    name: string
    size: number
  }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase()

  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

const ensureMedia = async (payload: PayloadInstance, imagePath: string, alt: string): Promise<number> => {
  const filename = path.basename(imagePath)
  const existing = await payload.find({
    collection: 'media',
    where: {
      filename: {
        equals: filename,
      },
    },
    limit: 1,
    depth: 0,
  })

  if (existing.docs[0]) {
    return Number(existing.docs[0].id)
  }

  const absolutePath = path.resolve(__dirname, '../../../frontend/public', imagePath.replace(/^\/+/, ''))
  const stats = await fs.stat(absolutePath)
  const buffer = await fs.readFile(absolutePath)

  const created = await payload.create({
    collection: 'media',
    data: {
      alt,
    },
    file: {
      data: buffer,
      mimetype: getMimeType(absolutePath),
      name: filename,
      size: stats.size,
    },
  } as MediaUploadCreateArgs)

  return Number(created.id)
}

async function main() {
  const payload = await getPayload({ config })

  let updatedCount = 0
  let skippedCount = 0

  for (const product of ALL_PRODUCTS) {
    const existing = await payload.find({
      collection: 'products',
      where: {
        slug: {
          equals: product.slug,
        },
      },
      limit: 1,
      depth: 0,
    })

    if (!existing.docs[0]) {
      skippedCount += 1
      continue
    }

    const mainImage = await ensureMedia(payload, product.image, product.name)
    const gallery = []

    for (const imagePath of (product.gallery ?? []).filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )) {
      const image = await ensureMedia(payload, imagePath, `${product.name} gallery image`)
      gallery.push({ image })
    }

    await payload.update({
      collection: 'products',
      id: existing.docs[0].id,
      data: {
        mainImage,
        gallery,
      },
    })

    updatedCount += 1
    console.log(`Migrated media for ${product.slug}`)
  }

  console.log(`Product media migration complete. Updated: ${updatedCount}, Skipped: ${skippedCount}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Product media migration failed:', error)
    process.exit(1)
  })
