import type { Product } from '../types/site'

import { resolveProductPricing } from './product-pricing'

type PayloadListResponse<T> = {
  docs?: T[]
}

type PayloadMediaDoc = {
  url?: unknown
}

type PayloadGalleryItem = {
  imageUrl?: unknown
  image?: PayloadMediaDoc | number | null
}

export type PayloadFeedProductDoc = {
  category?:
    | {
        name?: unknown
      }
    | number
    | null
  discountPercent?: unknown
  discountPrice?: unknown
  discountType?: unknown
  discountValidUntil?: unknown
  gallery?: PayloadGalleryItem[] | null
  id?: unknown
  imageUrl?: unknown
  mainImage?: PayloadMediaDoc | number | null
  name?: unknown
  oldPrice?: unknown
  price?: unknown
  shortDescription?: unknown
  sku?: unknown
  slug?: unknown
  stockStatus?: unknown
}

const DEFAULT_SITE_URL = 'http://localhost:3000'
const DEFAULT_PAYLOAD_API_URL = 'http://127.0.0.1:3001'
const DEFAULT_BRAND = 'Lumera'
const DEFAULT_LOCAL_ASSET_FALLBACK = '/assets/products/olivia-ruzova.webp'

export const getSiteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, '')

export const getPayloadApiUrl = () =>
  (process.env.PAYLOAD_API_URL?.trim() || DEFAULT_PAYLOAD_API_URL).replace(/\/+$/, '')

const normalizeText = (value: string | undefined) =>
  (value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const toAbsoluteUrl = (value: string, siteUrl: string) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `${siteUrl}${value.startsWith('/') ? value : `/${value}`}`
}

const toGoogleAvailability = (status: Product['stockStatus']) =>
  status === 'out-of-stock' ? 'out of stock' : 'in stock'

const toGooglePrice = (value: string) => {
  const numeric = Number(value.replace(/\s+/g, '').replace(',', '.').replace(/[^\d.]/g, ''))
  const safe = Number.isFinite(numeric) && numeric > 0 ? numeric : 0
  return `${safe.toFixed(2)} CZK`
}

const toNumericPrice = (value: string | undefined) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 0
  }

  const numeric = Number(value.replace(/\s+/g, '').replace(',', '.').replace(/[^\d.]/g, ''))
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

const resolvePayloadAssetUrl = (value: unknown, baseUrl: string): string | null => {
  if (typeof value !== 'string' || value.length === 0) {
    return null
  }

  if (/^https?:\/\//i.test(value)) {
    return value
  }

  if (value.startsWith('/')) {
    return `${baseUrl}${value}`
  }

  return `${baseUrl}/${value}`
}

const resolvePayloadGallery = (gallery: PayloadGalleryItem[] | null | undefined, baseUrl: string): string[] => {
  if (!Array.isArray(gallery)) {
    return []
  }

  return gallery
    .map((item) => {
      const uploaded =
        typeof item?.image === 'object' && item.image ? resolvePayloadAssetUrl(item.image.url, baseUrl) : null
      const linked = resolvePayloadAssetUrl(item?.imageUrl, baseUrl)
      return uploaded || linked
    })
    .filter((value): value is string => Boolean(value))
}

const resolvePrimaryImage = (doc: PayloadFeedProductDoc, baseUrl: string) => {
  const mainUploadUrl =
    typeof doc.mainImage === 'object' && doc.mainImage ? resolvePayloadAssetUrl(doc.mainImage.url, baseUrl) : null
  const imageUrl = resolvePayloadAssetUrl(doc.imageUrl, baseUrl)
  const galleryImage = resolvePayloadGallery(doc.gallery, baseUrl)[0]

  return mainUploadUrl || imageUrl || galleryImage || DEFAULT_LOCAL_ASSET_FALLBACK
}

export const mapPayloadFeedProduct = (doc: PayloadFeedProductDoc, baseUrl: string): Product | null => {
  const id = doc.id != null ? String(doc.id) : ''
  const name = typeof doc.name === 'string' ? doc.name.trim() : ''
  const slug = typeof doc.slug === 'string' ? doc.slug.trim() : ''

  if (!id || !name || !slug) {
    return null
  }

  const pricing = resolveProductPricing(doc)
  const category =
    typeof doc.category === 'object' && doc.category && typeof doc.category.name === 'string'
      ? doc.category.name
      : 'Uncategorized'

  return {
    category,
    gallery: resolvePayloadGallery(doc.gallery, baseUrl),
    id,
    image: resolvePrimaryImage(doc, baseUrl),
    name,
    oldPrice: pricing.compareAtPrice
      ? `${new Intl.NumberFormat('cs-CZ').format(Math.max(0, Math.round(pricing.compareAtPrice)))} Kč`
      : undefined,
    price: `${new Intl.NumberFormat('cs-CZ').format(Math.max(0, Math.round(pricing.currentPrice)))} Kč`,
    shortDescription: typeof doc.shortDescription === 'string' ? doc.shortDescription : undefined,
    sku: typeof doc.sku === 'string' ? doc.sku : undefined,
    slug,
    stockStatus:
      doc.stockStatus === 'in-stock' || doc.stockStatus === 'low-stock' || doc.stockStatus === 'out-of-stock'
        ? doc.stockStatus
        : 'in-stock',
  }
}

export const mapPayloadFeedProducts = (docs: PayloadFeedProductDoc[], baseUrl: string) =>
  docs.map((doc) => mapPayloadFeedProduct(doc, baseUrl)).filter((product): product is Product => Boolean(product))

const fetchMerchantProducts = async (): Promise<Product[]> => {
  const payloadApiUrl = getPayloadApiUrl()

  try {
    const response = await fetch(
      `${payloadApiUrl}/api/products?where[status][equals]=published&depth=2&limit=500&sort=-updatedAt`,
      {
        cache: 'no-store',
      },
    )

    if (!response.ok) {
      return []
    }

    const payload = (await response.json()) as PayloadListResponse<PayloadFeedProductDoc>
    const docs = Array.isArray(payload.docs) ? payload.docs : []
    return mapPayloadFeedProducts(docs, payloadApiUrl)
  } catch {
    return []
  }
}

const buildProductItemXml = (product: Product, siteUrl: string, populatedCategories: Set<string>) => {
  const descriptionSource = normalizeText(product.shortDescription || product.name)
  const description = descriptionSource || product.name
  const category = typeof product.category === 'string' ? product.category.trim() : ''
  const productType = populatedCategories.has(category) ? category : ''
  const currentPrice = toNumericPrice(product.price)
  const compareAtPrice = toNumericPrice(product.oldPrice)
  const hasSalePrice = compareAtPrice > currentPrice && currentPrice > 0
  const price = hasSalePrice ? product.oldPrice || product.price : product.price
  const salePrice = hasSalePrice ? product.price : ''
  const gallery = Array.isArray(product.gallery) ? product.gallery.filter(Boolean) : []
  const additionalImages = gallery
    .filter((image) => image !== product.image)
    .slice(0, 10)
    .map((image) => `    <g:additional_image_link>${escapeXml(toAbsoluteUrl(image, siteUrl))}</g:additional_image_link>`)
    .join('\n')
  const mpn = product.sku ? `    <g:mpn>${escapeXml(product.sku)}</g:mpn>` : ''

  return [
    '  <item>',
    `    <g:id>${escapeXml(String(product.id))}</g:id>`,
    `    <g:title>${escapeXml(product.name)}</g:title>`,
    `    <g:description>${escapeXml(description)}</g:description>`,
    `    <g:link>${escapeXml(`${siteUrl}/product/${product.slug}`)}</g:link>`,
    `    <g:image_link>${escapeXml(toAbsoluteUrl(product.image, siteUrl))}</g:image_link>`,
    additionalImages,
    `    <g:availability>${toGoogleAvailability(product.stockStatus)}</g:availability>`,
    '    <g:condition>new</g:condition>',
    `    <g:price>${toGooglePrice(price)}</g:price>`,
    salePrice ? `    <g:sale_price>${toGooglePrice(salePrice)}</g:sale_price>` : '',
    `    <g:brand>${DEFAULT_BRAND}</g:brand>`,
    `    <g:identifier_exists>${product.sku ? 'yes' : 'no'}</g:identifier_exists>`,
    productType ? `    <g:product_type>${escapeXml(productType)}</g:product_type>` : '',
    mpn,
    '  </item>',
  ]
    .filter(Boolean)
    .join('\n')
}

export const buildGoogleMerchantXml = (products: Product[], siteUrl = getSiteUrl()) => {
  const feedProducts = products.filter(
    (product) =>
      Boolean(product.slug) &&
      Boolean(product.image) &&
      Boolean(product.name) &&
      typeof product.price === 'string' &&
      product.price.trim().length > 0,
  )

  const populatedCategories = new Set(
    feedProducts
      .map((product) => (typeof product.category === 'string' ? product.category.trim() : ''))
      .filter(Boolean),
  )

  const items = feedProducts.map((product) => buildProductItemXml(product, siteUrl, populatedCategories)).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    `    <title>${escapeXml(DEFAULT_BRAND)}</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <description>${escapeXml('Google Merchant feed for Lumera')}</description>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}

export const generateGoogleMerchantXml = async (siteUrl = getSiteUrl()) => {
  const products = await fetchMerchantProducts()
  return buildGoogleMerchantXml(products, siteUrl)
}
