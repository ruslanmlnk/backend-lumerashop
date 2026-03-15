import 'dotenv/config'

import type { Where } from 'payload'
import { getPayload } from 'payload'

import { categoryHierarchySeed } from '../data/category-hierarchy'
import config from '../payload.config'

type DocWithId = {
  id: number | string
  slug?: string | null
}

async function upsertByWhere(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: 'categories' | 'category-groups' | 'subcategories',
  where: Where,
  data: Record<string, unknown>,
): Promise<DocWithId> {
  const existingDocs = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where,
  })

  const existingDoc = existingDocs.docs[0] as DocWithId | undefined

  if (existingDoc) {
    return payload.update({
      collection,
      id: existingDoc.id,
      data,
      depth: 0,
      overrideAccess: true,
    } as never) as unknown as Promise<DocWithId>
  }

  return payload.create({
    collection,
    data,
    depth: 0,
    overrideAccess: true,
  } as never) as unknown as Promise<DocWithId>
}

async function deleteDocsNotInSlugSet(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: 'categories' | 'category-groups' | 'subcategories',
  keepSlugs: Set<string>,
) {
  const existingDocs = await payload.find({
    collection,
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  })

  for (const doc of existingDocs.docs as DocWithId[]) {
    const slug = typeof doc.slug === 'string' ? doc.slug.trim() : ''
    if (!slug || keepSlugs.has(slug)) {
      continue
    }

    await payload.delete({
      collection,
      id: doc.id,
      overrideAccess: true,
    })
  }
}

async function seedCategoryHierarchy() {
  const payload = await getPayload({ config })

  const categorySlugSet = new Set<string>()
  const groupSlugSet = new Set<string>()
  const subcategorySlugSet = new Set<string>()

  for (let categoryIndex = 0; categoryIndex < categoryHierarchySeed.length; categoryIndex += 1) {
    const categorySeed = categoryHierarchySeed[categoryIndex]

    const categoryResult = await upsertByWhere(
      payload,
      'categories',
      {
        name: {
          equals: categorySeed.name,
        },
      },
      {
        name: categorySeed.name,
        showInMenu: categorySeed.showInMenu ?? true,
        sortOrder: categoryIndex + 1,
      },
    )

    const categoryId = categoryResult.id
    const categorySlug = typeof categoryResult.slug === 'string' ? categoryResult.slug.trim() : ''

    if (!categorySlug) {
      throw new Error(`Category "${categorySeed.name}" was created without a slug.`)
    }

    categorySlugSet.add(categorySlug)

    for (let groupIndex = 0; groupIndex < (categorySeed.groups?.length ?? 0); groupIndex += 1) {
      const groupSeed = categorySeed.groups?.[groupIndex]
      if (!groupSeed) continue

      const categoryGroupResult = await upsertByWhere(
        payload,
        'category-groups',
        {
          and: [
            {
              name: {
                equals: groupSeed.name,
              },
            },
            {
              category: {
                equals: categoryId,
              },
            },
          ],
        },
        {
          name: groupSeed.name,
          category: categoryId,
          showInMenu: true,
          sortOrder: groupIndex + 1,
        },
      )

      const groupId = categoryGroupResult.id
      const groupSlug = typeof categoryGroupResult.slug === 'string' ? categoryGroupResult.slug.trim() : ''

      if (!groupSlug) {
        throw new Error(`Category group "${groupSeed.name}" was created without a slug.`)
      }

      groupSlugSet.add(groupSlug)

      for (let subcategoryIndex = 0; subcategoryIndex < (groupSeed.subcategories?.length ?? 0); subcategoryIndex += 1) {
        const subcategorySeed = groupSeed.subcategories?.[subcategoryIndex]
        if (!subcategorySeed) continue

        const subcategoryResult = await upsertByWhere(
          payload,
          'subcategories',
          {
            and: [
              {
                name: {
                  equals: subcategorySeed.name,
                },
              },
              {
                categoryGroup: {
                  equals: groupId,
                },
              },
            ],
          },
          {
            name: subcategorySeed.name,
            category: categoryId,
            categoryGroup: groupId,
            showInMenu: true,
            sortOrder: subcategoryIndex + 1,
          },
        )

        const subcategorySlug = typeof subcategoryResult.slug === 'string' ? subcategoryResult.slug.trim() : ''
        if (!subcategorySlug) {
          throw new Error(`Subcategory "${subcategorySeed.name}" was created without a slug.`)
        }

        subcategorySlugSet.add(subcategorySlug)
      }
    }
  }

  await deleteDocsNotInSlugSet(payload, 'subcategories', subcategorySlugSet)
  await deleteDocsNotInSlugSet(payload, 'category-groups', groupSlugSet)
  await deleteDocsNotInSlugSet(payload, 'categories', categorySlugSet)

  console.log(
    `Seeded ${categorySlugSet.size} categories, ${groupSlugSet.size} category groups and ${subcategorySlugSet.size} subcategories.`,
  )
}

seedCategoryHierarchy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
