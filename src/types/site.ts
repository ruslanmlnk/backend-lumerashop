export interface ProductFilterValue {
  group: string
  option: string
  groupSlug?: string
  optionSlug?: string
}

export interface ProductMedia {
  type: 'image' | 'video'
  url: string
  alt?: string
}

export interface Product {
  id: string
  name: string
  price: string
  oldPrice?: string
  purchaseCount?: number
  image: string
  slug: string
  category: string
  categorySlug?: string
  subcategorySlugs?: string[]
  sku?: string
  gallery?: string[]
  mediaGallery?: ProductMedia[]
  specifications?: Record<string, string>
  filterValues?: ProductFilterValue[]
  highlights?: string[]
  stockStatus?: 'in-stock' | 'low-stock' | 'out-of-stock'
  isFeatured?: boolean
  isRecommended?: boolean
}

export interface Testimonial {
  text: string
  author: string
  location: string
}

export interface BlogPost {
  title: string
  excerpt: string
  content?: string
  date?: string
  image: string
  slug: string
}
