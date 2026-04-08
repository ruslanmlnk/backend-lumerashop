import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

export const Article: CollectionConfig = {
  slug: 'article',
  labels: {
    singular: 'Článek',
    plural: 'Články',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    slugField({
      useAsSlug: 'title',
    }),
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Název článku',
    },
    {
      name: 'mainImage',
      relationTo: 'media',
      type: 'upload',
      required: true,
      unique: true,
      label: 'Hlavní obrázek',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Perex',
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Obsah článku',
    },
  ],
}
