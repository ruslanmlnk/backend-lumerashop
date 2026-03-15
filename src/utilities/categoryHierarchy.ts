import type { PayloadRequest } from 'payload'

type RelationshipValue =
  | number
  | string
  | {
      id?: number | string | null
      slug?: string | null
      category?: number | string | { id?: number | string | null; slug?: string | null } | null
    }
  | null
  | undefined

type ResolvedRelation = {
  id: number | string
  slug: string
}

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ')

export const slugifySegment = (value: string) =>
  normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' a ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const buildCategoryGroupSlug = (categorySlug: string, name: string) =>
  `${slugifySegment(categorySlug)}-${slugifySegment(name)}`

export const buildSubcategorySlug = (groupSlug: string, name: string) =>
  `${slugifySegment(groupSlug)}-${slugifySegment(name)}`

const isResolvedRelation = (value: RelationshipValue): value is Exclude<RelationshipValue, number | string | null | undefined> =>
  typeof value === 'object' && value !== null

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
    const categoryId =
      isResolvedRelation(value.category) && value.category.id != null
        ? value.category.id
        : typeof value.category === 'number' || typeof value.category === 'string'
          ? value.category
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
      const categoryId =
        typeof categoryGroup.category === 'object' && categoryGroup.category && 'id' in categoryGroup.category
          ? categoryGroup.category.id
          : categoryGroup.category

      return {
        id: categoryGroup.id,
        slug: categoryGroup.slug.trim(),
        categoryId: categoryId ?? null,
      }
    }
  }

  return null
}
