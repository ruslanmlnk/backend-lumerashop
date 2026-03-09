import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../payload.config'
import { CATALOG_CATEGORY_PRESETS } from '../../../frontend/data/catalog-categories'

async function main() {
  const payload = await getPayload({ config })

  let createdCategories = 0
  let updatedCategories = 0
  let createdSubcategories = 0
  let updatedSubcategories = 0

  for (const categoryPreset of CATALOG_CATEGORY_PRESETS) {
    const existingCategory = await payload.find({
      collection: 'categories',
      where: {
        slug: {
          equals: categoryPreset.slug,
        },
      },
      limit: 1,
      depth: 0,
    })

    const categoryDoc = existingCategory.docs[0]
      ? await payload.update({
          collection: 'categories',
        id: existingCategory.docs[0].id,
        data: {
          name: categoryPreset.name,
          slug: categoryPreset.slug,
          showInMenu: Boolean(categoryPreset.showInMenu),
        },
      })
      : await payload.create({
          collection: 'categories',
          data: {
            name: categoryPreset.name,
            slug: categoryPreset.slug,
            showInMenu: Boolean(categoryPreset.showInMenu),
          },
        })

    if (existingCategory.docs[0]) {
      updatedCategories += 1
    } else {
      createdCategories += 1
    }

    for (const subcategoryPreset of categoryPreset.subcategories ?? []) {
      const existingSubcategory = await payload.find({
        collection: 'subcategories',
        where: {
          slug: {
            equals: subcategoryPreset.slug,
          },
        },
        limit: 1,
        depth: 0,
      })

      if (existingSubcategory.docs[0]) {
        await payload.update({
          collection: 'subcategories',
          id: existingSubcategory.docs[0].id,
          data: {
            name: subcategoryPreset.name,
            slug: subcategoryPreset.slug,
            category: categoryDoc.id,
            showInMenu: Boolean(subcategoryPreset.showInMenu),
          },
        })

        updatedSubcategories += 1
        continue
      }

      await payload.create({
        collection: 'subcategories',
        data: {
          name: subcategoryPreset.name,
          slug: subcategoryPreset.slug,
          category: categoryDoc.id,
          showInMenu: Boolean(subcategoryPreset.showInMenu),
        },
      })

      createdSubcategories += 1
    }
  }

  console.log(
    `Catalog categories seeded. Categories created: ${createdCategories}, categories updated: ${updatedCategories}, subcategories created: ${createdSubcategories}, subcategories updated: ${updatedSubcategories}`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Catalog category seed failed:', error)
    process.exit(1)
  })
