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
      label: 'Název stránky',
      required: true,
      defaultValue: defaultTitle,
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Hero obrázek',
      admin: {
        description: 'Obrázek zobrazený ve velkém hero banneru nad obsahem stránky.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Obsah stránky',
      required: true,
      admin: {
        description:
          contentDescription ??
          'Tato stránka se zobrazuje ve footer routě storefrontu a používá editor Lexical.',
      },
    },
    seo,
  ],
})
