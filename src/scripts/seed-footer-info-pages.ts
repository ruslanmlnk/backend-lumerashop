import 'dotenv/config'

import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import { footerInfoPageSeeds } from '../data/footer-info-pages'
import { convertHtmlToLexicalDocument } from '../lib/html-to-lexical'
import config from '../payload.config'

type MediaDoc = {
  id: number | string
  filename?: string | null
}

const TEMP_DIR = path.join(process.cwd(), '.footer-page-cache')

const hashString = (value: string) => createHash('sha1').update(value).digest('hex')

const getCachedImageFilename = (url: string) => {
  const parsedUrl = new URL(url)
  const extension = path.extname(parsedUrl.pathname) || '.bin'
  return `info-page-${hashString(url)}${extension}`
}

async function downloadImage(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Lumera Footer Page Seed/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download ${url} (${response.status})`)
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer())
  const filePath = path.join(TEMP_DIR, getCachedImageFilename(url))

  await writeFile(filePath, imageBuffer)

  return filePath
}

async function seedFooterInfoPages() {
  const payload = await getPayload({ config })
  await mkdir(TEMP_DIR, { recursive: true })

  const mediaIdCache = new Map<string, number | string>()
  const mediaFilenameCache = new Map<string, number | string>()
  const existingMedia = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  } as never)

  for (const media of (existingMedia.docs as MediaDoc[]) ?? []) {
    const filename = typeof media.filename === 'string' ? media.filename.trim() : ''
    if (filename) {
      mediaFilenameCache.set(filename, media.id)
    }
  }

  const createMediaFromUrl = async (url: string, alt: string) => {
    const cached = mediaIdCache.get(url)
    if (cached != null) {
      return cached
    }

    const filename = getCachedImageFilename(url)
    const existingId = mediaFilenameCache.get(filename)

    if (existingId != null) {
      mediaIdCache.set(url, existingId)
      return existingId
    }

    const filePath = await downloadImage(url)
    const created = (await payload.create({
      collection: 'media',
      data: {
        alt,
      },
      depth: 0,
      filePath,
      overrideAccess: true,
    } as never)) as unknown as MediaDoc

    mediaIdCache.set(url, created.id)
    mediaFilenameCache.set(filename, created.id)

    return created.id
  }

  for (const page of footerInfoPageSeeds) {
    const heroImageId = await createMediaFromUrl(page.heroImageUrl, page.title)

    await payload.updateGlobal({
      slug: page.globalSlug,
      data: {
        title: page.title,
        heroImage: heroImageId,
        content: convertHtmlToLexicalDocument(page.contentHtml),
        seo: {
          title: page.title,
          description: page.seoDescription,
        },
      },
      depth: 0,
      overrideAccess: true,
    } as never)
  }

  console.log(`Seeded ${footerInfoPageSeeds.length} footer information pages.`)
}

seedFooterInfoPages()
  .then(async () => {
    await rm(TEMP_DIR, { recursive: true, force: true })
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    rm(TEMP_DIR, { recursive: true, force: true }).finally(() => process.exit(1))
  })
