import { JSDOM } from 'jsdom'

type LexicalTextNode = {
  type: 'text'
  detail: number
  format: number
  mode: 'normal'
  style: string
  text: string
  version: 1
}

type LexicalLineBreakNode = {
  type: 'linebreak'
  version: 1
}

type LexicalLinkNode = {
  type: 'link'
  children: LexicalInlineNode[]
  direction: 'ltr'
  fields: {
    url: string
  }
  format: string
  indent: number
  version: 1
}

type LexicalParagraphNode = {
  type: 'paragraph'
  children: LexicalInlineNode[]
  direction: 'ltr'
  format: string
  indent: number
  textFormat: number
  textStyle: string
  version: 1
}

type LexicalHeadingNode = {
  type: 'heading'
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  children: LexicalInlineNode[]
  direction: 'ltr'
  format: string
  indent: number
  version: 1
}

type LexicalListItemNode = {
  type: 'listitem'
  children: Array<LexicalInlineNode | LexicalListNode>
  direction: 'ltr'
  format: string
  indent: number
  value: number
  version: 1
}

type LexicalListNode = {
  type: 'list'
  listType: 'bullet' | 'number'
  tag: 'ul' | 'ol'
  children: LexicalListItemNode[]
  direction: 'ltr'
  format: string
  indent: number
  start: number
  version: 1
}

type LexicalQuoteNode = {
  type: 'quote'
  children: LexicalInlineNode[]
  direction: 'ltr'
  format: string
  indent: number
  version: 1
}

type LexicalRootNode = {
  root: {
    type: 'root'
    children: LexicalBlockNode[]
    direction: 'ltr'
    format: string
    indent: number
    version: 1
  }
}

type LexicalInlineNode = LexicalTextNode | LexicalLineBreakNode | LexicalLinkNode
type LexicalBlockNode = LexicalParagraphNode | LexicalHeadingNode | LexicalListNode | LexicalQuoteNode

const TEXT_FORMAT = {
  bold: 1,
  italic: 2,
  underline: 8,
  code: 16,
} as const

const INLINE_ELEMENT_TAGS = new Set(['a', 'b', 'br', 'code', 'em', 'i', 'span', 'strong', 'u'])

function createTextNode(text: string, format = 0): LexicalTextNode | null {
  const normalizedText = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ')

  if (!normalizedText.trim()) {
    return null
  }

  return {
    type: 'text',
    detail: 0,
    format,
    mode: 'normal',
    style: '',
    text: normalizedText,
    version: 1,
  }
}

function createLineBreakNode(): LexicalLineBreakNode {
  return {
    type: 'linebreak',
    version: 1,
  }
}

function trimInlineChildren(children: LexicalInlineNode[]) {
  const trimmedChildren = [...children]
  const first = trimmedChildren[0]
  const last = trimmedChildren[trimmedChildren.length - 1]

  if (first?.type === 'text') {
    first.text = first.text.replace(/^\s+/, '')
    if (!first.text) {
      trimmedChildren.shift()
    }
  }

  const updatedLast = trimmedChildren[trimmedChildren.length - 1]
  if (updatedLast?.type === 'text') {
    updatedLast.text = updatedLast.text.replace(/\s+$/, '')
    if (!updatedLast.text) {
      trimmedChildren.pop()
    }
  }

  return trimmedChildren
}

function parseInlineNode(node: Node, inheritedFormat = 0): LexicalInlineNode[] {
  if (node.nodeType === node.TEXT_NODE) {
    const textNode = createTextNode(node.textContent ?? '', inheritedFormat)
    return textNode ? [textNode] : []
  }

  if (node.nodeType !== node.ELEMENT_NODE) {
    return []
  }

  const element = node as Element
  const tag = element.tagName.toLowerCase()

  if (tag === 'br') {
    return [createLineBreakNode()]
  }

  if (tag === 'strong' || tag === 'b') {
    return parseInlineChildren(element, inheritedFormat | TEXT_FORMAT.bold)
  }

  if (tag === 'em' || tag === 'i') {
    return parseInlineChildren(element, inheritedFormat | TEXT_FORMAT.italic)
  }

  if (tag === 'u') {
    return parseInlineChildren(element, inheritedFormat | TEXT_FORMAT.underline)
  }

  if (tag === 'code') {
    return parseInlineChildren(element, inheritedFormat | TEXT_FORMAT.code)
  }

  if (tag === 'a') {
    const url = (element.getAttribute('href') ?? '').trim()
    const children = trimInlineChildren(parseInlineChildren(element, inheritedFormat))

    if (!children.length) {
      return []
    }

    return [
      {
        type: 'link',
        children,
        direction: 'ltr',
        fields: {
          url: url || '#',
        },
        format: '',
        indent: 0,
        version: 1,
      },
    ]
  }

  return parseInlineChildren(element, inheritedFormat)
}

function parseInlineChildren(node: Node, inheritedFormat = 0): LexicalInlineNode[] {
  const inlineChildren = Array.from(node.childNodes).flatMap((child) => parseInlineNode(child, inheritedFormat))
  return trimInlineChildren(inlineChildren)
}

function createParagraphNode(children: LexicalInlineNode[]): LexicalParagraphNode | null {
  if (!children.length) {
    return null
  }

  return {
    type: 'paragraph',
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
    version: 1,
  }
}

function createHeadingNode(
  tag: LexicalHeadingNode['tag'],
  children: LexicalInlineNode[],
): LexicalHeadingNode | null {
  if (!children.length) {
    return null
  }

  return {
    type: 'heading',
    tag,
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  }
}

function createQuoteNode(children: LexicalInlineNode[]): LexicalQuoteNode | null {
  if (!children.length) {
    return null
  }

  return {
    type: 'quote',
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  }
}

function parseListItem(element: Element, index: number): LexicalListItemNode | null {
  const children: Array<LexicalInlineNode | LexicalListNode> = []

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType !== child.ELEMENT_NODE) {
      children.push(...parseInlineNode(child))
      continue
    }

    const childElement = child as Element
    const tag = childElement.tagName.toLowerCase()

    if (tag === 'ul' || tag === 'ol') {
      const nestedList = parseListNode(childElement)
      if (nestedList) {
        children.push(nestedList)
      }
      continue
    }

    children.push(...parseInlineNode(childElement))
  }

  const normalizedChildren = children.filter((child) => {
    if (child.type === 'text') {
      return Boolean(child.text.trim())
    }

    if (child.type === 'link') {
      return child.children.length > 0
    }

    return true
  })

  if (!normalizedChildren.length) {
    return null
  }

  return {
    type: 'listitem',
    children: normalizedChildren,
    direction: 'ltr',
    format: '',
    indent: 0,
    value: index + 1,
    version: 1,
  }
}

function parseListNode(element: Element): LexicalListNode | null {
  const listType = element.tagName.toLowerCase() === 'ol' ? 'number' : 'bullet'
  const children = Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((child, index) => parseListItem(child, index))
    .filter(Boolean) as LexicalListItemNode[]

  if (!children.length) {
    return null
  }

  return {
    type: 'list',
    listType,
    tag: listType === 'number' ? 'ol' : 'ul',
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    start: 1,
    version: 1,
  }
}

function parseBlockNodes(parent: ParentNode): LexicalBlockNode[] {
  const blocks: LexicalBlockNode[] = []
  let inlineBuffer: LexicalInlineNode[] = []

  const flushInlineBuffer = () => {
    const paragraph = createParagraphNode(trimInlineChildren(inlineBuffer))
    inlineBuffer = []

    if (paragraph) {
      blocks.push(paragraph)
    }
  }

  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === child.TEXT_NODE) {
      inlineBuffer.push(...parseInlineNode(child))
      continue
    }

    if (child.nodeType !== child.ELEMENT_NODE) {
      continue
    }

    const element = child as Element
    const tag = element.tagName.toLowerCase()

    if (tag === 'p') {
      flushInlineBuffer()
      const paragraph = createParagraphNode(parseInlineChildren(element))
      if (paragraph) {
        blocks.push(paragraph)
      }
      continue
    }

    if (/^h[1-6]$/.test(tag)) {
      flushInlineBuffer()
      const heading = createHeadingNode(tag as LexicalHeadingNode['tag'], parseInlineChildren(element))
      if (heading) {
        blocks.push(heading)
      }
      continue
    }

    if (tag === 'ul' || tag === 'ol') {
      flushInlineBuffer()
      const list = parseListNode(element)
      if (list) {
        blocks.push(list)
      }
      continue
    }

    if (tag === 'blockquote') {
      flushInlineBuffer()
      const quote = createQuoteNode(parseInlineChildren(element))
      if (quote) {
        blocks.push(quote)
      }
      continue
    }

    if (tag === 'section' || tag === 'article' || tag === 'div') {
      flushInlineBuffer()
      blocks.push(...parseBlockNodes(element))
      continue
    }

    if (INLINE_ELEMENT_TAGS.has(tag) || tag === 'a') {
      inlineBuffer.push(...parseInlineNode(element))
      continue
    }

    flushInlineBuffer()
    blocks.push(...parseBlockNodes(element))
  }

  flushInlineBuffer()

  return blocks
}

export function convertHtmlToLexicalDocument(html: string): LexicalRootNode {
  const dom = new JSDOM(`<body>${html}</body>`)
  const children = parseBlockNodes(dom.window.document.body)

  return {
    root: {
      type: 'root',
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}
