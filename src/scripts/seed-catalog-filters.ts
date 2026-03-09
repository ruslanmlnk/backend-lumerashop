import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../payload.config'
import { CATALOG_FILTER_PRESETS } from '../../../frontend/data/catalog-filter-presets'

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

async function main() {
  const payload = await getPayload({ config })

  let createdGroups = 0
  let updatedGroups = 0
  let createdOptions = 0
  let updatedOptions = 0

  for (const groupPreset of CATALOG_FILTER_PRESETS) {
    const existingGroup = await payload.find({
      collection: 'filter-groups' as never,
      where: {
        slug: {
          equals: groupPreset.slug,
        },
      },
      limit: 1,
      depth: 0,
    })

    const groupDoc = existingGroup.docs[0]
      ? await payload.update({
          collection: 'filter-groups' as never,
          id: existingGroup.docs[0].id,
          data: {
            name: groupPreset.name,
            slug: groupPreset.slug,
            sortOrder: groupPreset.sortOrder,
            isActive: true,
          },
        })
      : await payload.create({
          collection: 'filter-groups' as never,
          data: {
            name: groupPreset.name,
            slug: groupPreset.slug,
            sortOrder: groupPreset.sortOrder,
            isActive: true,
          },
        })

    if (existingGroup.docs[0]) {
      updatedGroups += 1
    } else {
      createdGroups += 1
    }

    for (const optionPreset of groupPreset.options) {
      const optionSlug = `${groupPreset.slug}-${slugify(optionPreset.name)}`
      const existingOption = await payload.find({
        collection: 'filter-options' as never,
        where: {
          slug: {
            equals: optionSlug,
          },
        },
        limit: 1,
        depth: 0,
      })

      if (existingOption.docs[0]) {
        await payload.update({
          collection: 'filter-options' as never,
          id: existingOption.docs[0].id,
          data: {
            name: optionPreset.name,
            slug: optionSlug,
            group: groupDoc.id,
            sortOrder: optionPreset.sortOrder,
            isActive: true,
          },
        })

        updatedOptions += 1
        continue
      }

      await payload.create({
        collection: 'filter-options' as never,
        data: {
          name: optionPreset.name,
          slug: optionSlug,
          group: groupDoc.id,
          sortOrder: optionPreset.sortOrder,
          isActive: true,
        },
      })

      createdOptions += 1
    }
  }

  console.log(
    `Catalog filters seeded. Groups created: ${createdGroups}, groups updated: ${updatedGroups}, options created: ${createdOptions}, options updated: ${updatedOptions}`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Catalog filter seed failed:', error)
    process.exit(1)
  })
