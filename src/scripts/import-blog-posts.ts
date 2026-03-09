import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

import config from '../payload.config'
import { BLOG_POSTS } from '../../../frontend/data/site-data'

type LexicalTextNode = {
  detail: number
  format: number
  mode: 'normal'
  style: string
  text: string
  type: 'text'
  version: 1
}

type LexicalNode = {
  children?: Array<LexicalNode | LexicalTextNode>
  direction?: 'ltr'
  format?: '' | 'left'
  indent?: number
  tag?: string
  listType?: 'bullet'
  start?: number
  type: string
  version: 1
  value?: number
}

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

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim()

const decodeHtml = (value: string): string =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

const textNode = (text: string, format = 0): LexicalTextNode => ({
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text,
  type: 'text',
  version: 1,
})

const paragraphNode = (children: LexicalTextNode[]): LexicalNode => ({
  children: children.length ? children : [textNode('')],
  direction: 'ltr',
  format: '',
  indent: 0,
  type: 'paragraph',
  version: 1,
})

const headingNode = (tag: string, children: LexicalTextNode[]): LexicalNode => ({
  children: children.length ? children : [textNode('')],
  direction: 'ltr',
  format: '',
  indent: 0,
  tag,
  type: 'heading',
  version: 1,
})

const listItemNode = (children: LexicalTextNode[], value: number): LexicalNode => ({
  children: [paragraphNode(children)],
  direction: 'ltr',
  format: '',
  indent: 0,
  type: 'listitem',
  value,
  version: 1,
})

const listNode = (children: LexicalNode[]): LexicalNode => ({
  children,
  direction: 'ltr',
  format: '',
  indent: 0,
  listType: 'bullet',
  start: 1,
  tag: 'ul',
  type: 'list',
  version: 1,
})

const parseInlineHtml = (html: string): LexicalTextNode[] => {
  const source = decodeHtml(html)
  const nodes: LexicalTextNode[] = []
  const regex = /<(strong|em)>([\s\S]*?)<\/\1>/gi
  let cursor = 0
  let match: RegExpExecArray | null = regex.exec(source)

  while (match) {
    const [fullMatch, tag, text] = match
    const plain = normalizeWhitespace(source.slice(cursor, match.index))
    if (plain) {
      nodes.push(textNode(plain))
    }

    const normalized = normalizeWhitespace(text)
    if (normalized) {
      nodes.push(textNode(normalized, tag.toLowerCase() === 'strong' ? 1 : 2))
    }

    cursor = match.index + fullMatch.length
    match = regex.exec(source)
  }

  const rest = normalizeWhitespace(source.slice(cursor))
  if (rest) {
    nodes.push(textNode(rest))
  }

  return nodes
}

const htmlToLexical = (html: string) => {
  const blockRegex = /<(p|h3|ul)>([\s\S]*?)<\/\1>/gi
  const children: LexicalNode[] = []
  let match: RegExpExecArray | null = blockRegex.exec(html)

  while (match) {
    const [, tag, inner] = match

    if (tag.toLowerCase() === 'p') {
      children.push(paragraphNode(parseInlineHtml(inner)))
    } else if (tag.toLowerCase() === 'h3') {
      children.push(headingNode('h3', parseInlineHtml(inner)))
    } else if (tag.toLowerCase() === 'ul') {
      const items = Array.from(inner.matchAll(/<li>([\s\S]*?)<\/li>/gi))
        .map((item, index) => listItemNode(parseInlineHtml(item[1] ?? ''), index + 1))
      if (items.length > 0) {
        children.push(listNode(items))
      }
    }

    match = blockRegex.exec(html)
  }

  return {
    root: {
      children,
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      type: 'root',
      version: 1 as const,
    },
  }
}

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

const ensureMedia = async (payload: PayloadInstance, imagePath: string, alt: string) => {
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

  let createdCount = 0
  let updatedCount = 0
  const importedArticleIds: number[] = []

  for (const post of BLOG_POSTS) {
    const mainImage = await ensureMedia(payload, post.image, post.title)
    const content = typeof post.content === 'string' ? htmlToLexical(post.content) : undefined

    const existing = await payload.find({
      collection: 'article',
      where: {
        slug: {
          equals: post.slug,
        },
      },
      limit: 1,
      depth: 0,
    })

    const data = {
      title: post.title,
      slug: post.slug,
      mainImage,
      description: post.excerpt,
      content,
    }

    if (existing.docs[0]) {
      const updated = await payload.update({
        collection: 'article',
        id: existing.docs[0].id,
        data,
      })
      importedArticleIds.push(Number(updated.id))
      updatedCount += 1
    } else {
      const created = await payload.create({
        collection: 'article',
        data,
      })
      importedArticleIds.push(Number(created.id))
      createdCount += 1
    }
  }

  const currentHomePage = await payload.findGlobal({
    slug: 'home-page',
    depth: 0,
  })

  const currentBlogSection =
    typeof currentHomePage?.blogSection === 'object' && currentHomePage.blogSection ? currentHomePage.blogSection : null

  if (!Array.isArray(currentBlogSection?.featuredArticles) || currentBlogSection.featuredArticles.length === 0) {
    await payload.updateGlobal({
      slug: 'home-page',
      data: {
        blogSection: {
          title:
            typeof currentBlogSection?.title === 'string' && currentBlogSection.title.length > 0
              ? currentBlogSection.title
              : 'Z blogu Lumera',
          description:
            typeof currentBlogSection?.description === 'string' && currentBlogSection.description.length > 0
              ? currentBlogSection.description
              : 'Styl, inspirace a péče o vaše kožené doplňky.',
          featuredArticles: importedArticleIds.slice(0, 3),
        },
      },
    })
  }

  console.log(`Blog import complete. Created: ${createdCount}, Updated: ${updatedCount}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Blog import failed:', error)
    process.exit(1)
  })
