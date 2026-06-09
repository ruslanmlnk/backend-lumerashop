import type { PayloadRequest } from 'payload'

import { slugifySegment } from './slugify'

type RelationshipObject = {
  id?: number | string | null
  slug?: string | null
  category?: RelationshipValue
}

type RelationshipValue =
  | number
  | string
  | RelationshipValue[]
  | RelationshipObject
  | null
  | undefined

type ResolvedRelation = {
  id: number | string
  slug: string
}

export const buildCategoryGroupSlug = (categorySlug: string, name: string) =>
  `${slugifySegment(categorySlug)}-${slugifySegment(name)}`

export const buildSubcategorySlug = (groupSlug: string, name: string) =>
  `${slugifySegment(groupSlug)}-${slugifySegment(name)}`

const isResolvedRelation = (value: RelationshipValue): value is RelationshipObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const resolveCategoryRelation = async (
  req: PayloadRequest,
  value: RelationshipValue,
): Promise<ResolvedRelation | null> => {
  if (isResolvedRelation(value) && value.id != null && typeof value.slug === 'string' && value.slug.trim()) {
    return {
      id: value.id,
      slug: value.slug.trim(),
    }
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const category = await req.payload.findByID({
      collection: 'categories',
      id: value,
      depth: 0,
      overrideAccess: true,
      req,
    })

    if (category?.id != null && typeof category.slug === 'string' && category.slug.trim()) {
      return {
        id: category.id,
        slug: category.slug.trim(),
      }
    }
  }

  return null
}

export const resolveCategoryGroupRelation = async (
  req: PayloadRequest,
  value: RelationshipValue,
): Promise<(ResolvedRelation & { categoryId?: number | string | null }) | null> => {
  if (isResolvedRelation(value) && value.id != null && typeof value.slug === 'string' && value.slug.trim()) {
    const categoryValue = Array.isArray(value.category) ? value.category[0] : value.category
    const categoryId =
      isResolvedRelation(categoryValue) && categoryValue.id != null
        ? categoryValue.id
        : typeof categoryValue === 'number' || typeof categoryValue === 'string'
          ? categoryValue
          : null

    return {
      id: value.id,
      slug: value.slug.trim(),
      categoryId,
    }
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const categoryGroup = await req.payload.findByID({
      collection: 'category-groups',
      id: value,
      depth: 1,
      overrideAccess: true,
      req,
    })

    if (categoryGroup?.id != null && typeof categoryGroup.slug === 'string' && categoryGroup.slug.trim()) {
      const categoryValue = Array.isArray(categoryGroup.category) ? categoryGroup.category[0] : categoryGroup.category
      const categoryId =
        typeof categoryValue === 'object' && categoryValue && 'id' in categoryValue
          ? categoryValue.id
          : categoryValue

      return {
        id: categoryGroup.id,
        slug: categoryGroup.slug.trim(),
        categoryId: categoryId ?? null,
      }
    }
  }

  return null
}
