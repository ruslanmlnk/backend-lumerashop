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

  const relationId = isResolvedRelation(value) ? value.id : value

  if (typeof relationId === 'number' || typeof relationId === 'string') {
    const category = await req.payload.findByID({
      collection: 'categories',
      id: relationId,
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

export const resolveCategoryRelations = async (
  req: PayloadRequest,
  value: RelationshipValue,
): Promise<ResolvedRelation[]> => {
  const values = Array.isArray(value) ? value : value != null ? [value] : []
  const resolved = (await Promise.all(values.map((item) => resolveCategoryRelation(req, item)))).filter(
    (item): item is ResolvedRelation => item !== null,
  )

  return Array.from(new Map(resolved.map((item) => [String(item.id), item])).values())
}

export const resolveCategoryGroupRelation = async (
  req: PayloadRequest,
  value: RelationshipValue,
): Promise<(ResolvedRelation & { categoryIds: Array<number | string> }) | null> => {
  if (
    isResolvedRelation(value) &&
    value.id != null &&
    typeof value.slug === 'string' &&
    value.slug.trim() &&
    value.category != null
  ) {
    const categoryValues = Array.isArray(value.category) ? value.category : value.category != null ? [value.category] : []
    const categoryIds = categoryValues
      .map((categoryValue) =>
        isResolvedRelation(categoryValue) && categoryValue.id != null
          ? categoryValue.id
          : typeof categoryValue === 'number' || typeof categoryValue === 'string'
            ? categoryValue
            : null,
      )
      .filter((id): id is number | string => id != null)

    return {
      id: value.id,
      slug: value.slug.trim(),
      categoryIds,
    }
  }

  const relationId = isResolvedRelation(value) ? value.id : value

  if (typeof relationId === 'number' || typeof relationId === 'string') {
    const categoryGroup = await req.payload.findByID({
      collection: 'category-groups',
      id: relationId,
      depth: 1,
      overrideAccess: true,
      req,
    })

    if (categoryGroup?.id != null && typeof categoryGroup.slug === 'string' && categoryGroup.slug.trim()) {
      const categoryValues = Array.isArray(categoryGroup.category)
        ? categoryGroup.category
        : categoryGroup.category != null
          ? [categoryGroup.category]
          : []
      const categoryIds = categoryValues
        .map((categoryValue) =>
          typeof categoryValue === 'object' && categoryValue && 'id' in categoryValue
            ? categoryValue.id
            : categoryValue,
        )
        .filter((id): id is number => typeof id === 'number')

      return {
        id: categoryGroup.id,
        slug: categoryGroup.slug.trim(),
        categoryIds,
      }
    }
  }

  return null
}
