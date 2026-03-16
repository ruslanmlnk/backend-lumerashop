import type { GlobalConfig } from 'payload'

import { seo } from '../fields/seo'

type CreateInfoPageGlobalArgs = {
  slug: string
  label: string
  defaultTitle: string
  contentDescription?: string
}

export const createInfoPageGlobal = ({
  slug,
  label,
  defaultTitle,
  contentDescription,
}: CreateInfoPageGlobalArgs): GlobalConfig => ({
  slug,
  label,
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Page title',
      required: true,
      defaultValue: defaultTitle,
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Hero image',
      admin: {
        description: 'Image shown in the large hero banner above the page content.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Page content',
      required: true,
      admin: {
        description:
          contentDescription ??
          'This page is rendered on the storefront footer route and uses the Lexical editor.',
      },
    },
    seo,
  ],
})
