import type { CollectionConfig, Where } from 'payload'
import { slugField } from 'payload'

import {
  clampProductDiscountPercent,
  normalizeProductDiscountType,
  normalizeProductDiscountValidUntil,
  normalizeProductPricingData,
  resolveStoredProductRegularPrice,
} from '@/lib/product-pricing'

const requireUploadedMedia = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return true
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return true
  }

  if (typeof value === 'object' && value !== null) {
    return true
  }

  return 'Nahrajte soubor média.'
}

type AdminUser = {
  role?: string
} | null

type ProductBulkDiscountBody = {
  discountPercent?: unknown
  discountPrice?: unknown
  discountType?: unknown
  discountValidUntil?: unknown
  ids?: unknown
}

const asUser = (value: unknown): AdminUser => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  return value as AdminUser
}

const hasAdminRole = (user: unknown) => asUser(user)?.role === 'admin'

const parseSelectedIDs = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => {
      if (typeof entry === 'number' && Number.isInteger(entry)) {
        return entry
      }

      if (typeof entry === 'string' && entry.trim().length > 0) {
        const trimmed = entry.trim()
        const numeric = Number(trimmed)

        return Number.isInteger(numeric) ? numeric : trimmed
      }

      return null
    })
    .filter((entry): entry is number | string => entry !== null)
}

const parseMoney = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0
  }

  return Math.round((numeric + Number.EPSILON) * 100) / 100
}

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: 'Produkt',
    plural: 'Produkty',
  },
  admin: {
    useAsTitle: 'name',
    components: {
      beforeListTable: ['@/components/admin/products/ProductBulkDiscountPanel'],
    },
    defaultColumns: [
      'name',
      'price',
      'category',
      'categoryGroup',
      'status',
      'isFeatured',
      'isRecommended',
      'updatedAt',
    ],
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (!data || typeof data !== 'object') {
          return data
        }

        return normalizeProductPricingData(
          data as Record<string, unknown>,
          originalDoc && typeof originalDoc === 'object'
            ? (originalDoc as Record<string, unknown>)
            : undefined,
        )
      },
    ],
  },
  access: {
    read: () => true,
  },
  endpoints: [
    {
      path: '/bulk-discount',
      method: 'post',
      handler: async (req) => {
        if (!hasAdminRole(req.user)) {
          return Response.json({ error: 'Forbidden.' }, { status: 403 })
        }

        let body: ProductBulkDiscountBody

        try {
          body = (await req.json?.()) as ProductBulkDiscountBody
        } catch {
          return Response.json({ error: 'Invalid request body.' }, { status: 400 })
        }

        const ids = parseSelectedIDs(body.ids)

        if (ids.length === 0) {
          return Response.json({ error: 'Select at least one product.' }, { status: 400 })
        }

        const discountType = normalizeProductDiscountType(body.discountType)
        const discountPrice = parseMoney(body.discountPrice)
        const discountPercent = clampProductDiscountPercent(body.discountPercent)
        const discountValidUntil = normalizeProductDiscountValidUntil(body.discountValidUntil)

        const products = await req.payload.find({
          collection: 'products' as never,
          where: {
            id: {
              in: ids,
            },
          },
          depth: 0,
          limit: ids.length,
          overrideAccess: true,
        })

        let skippedCount = 0
        let updatedCount = 0

        for (const doc of products.docs as Array<Record<string, unknown>>) {
          const regularPrice = resolveStoredProductRegularPrice(doc)

          if (regularPrice <= 0) {
            skippedCount += 1
            continue
          }

          if (discountType === 'price' && !(discountPrice > 0 && discountPrice < regularPrice)) {
            skippedCount += 1
            continue
          }

          if (discountType === 'percent' && !(discountPercent > 0 && discountPercent <= 100)) {
            skippedCount += 1
            continue
          }

          await req.payload.update({
            collection: 'products' as never,
            data: {
              discountPercent: discountType === 'percent' ? discountPercent : null,
              discountPrice: discountType === 'price' ? discountPrice : null,
              discountType,
              discountValidUntil: discountType ? discountValidUntil : null,
              oldPrice: null,
              price: regularPrice,
            } as never,
            depth: 0,
            id: doc.id as number | string,
            overrideAccess: true,
          })

          updatedCount += 1
        }

        return Response.json(
          {
            skippedCount,
            updatedCount,
          },
          { status: 200 },
        )
      },
    },
  ],
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Název produktu',
      admin: {
        components: {
          Cell: '@/components/admin/products/ProductNameCell',
        },
      },
    },
    slugField({
      useAsSlug: 'name',
    }),
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          type: 'number',
          required: true,
          label: 'Cena (Kč)',
          admin: {
            components: {
              Cell: '@/components/admin/products/ProductPriceCell',
            },
            description: 'Běžná cena bez slevy.',
            width: '50%',
          },
        },
        {
          name: 'discountType',
          type: 'select',
          label: 'Typ slevy',
          options: [
            {
              label: 'Akční cena',
              value: 'price',
            },
            {
              label: 'Sleva v %',
              value: 'percent',
            },
          ],
          admin: {
            description: 'Vyberte, zda se sleva zadává akční cenou nebo procenty.',
            width: '50%',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'discountPrice',
          type: 'number',
          label: 'Akční cena (Kč)',
          admin: {
            condition: (data) => data?.discountType === 'price',
            description: 'Finální cena, která se zobrazí zákazníkovi během slevy.',
            width: '33%',
          },
        },
        {
          name: 'discountPercent',
          type: 'number',
          label: 'Sleva (%)',
          admin: {
            condition: (data) => data?.discountType === 'percent',
            description: 'Sleva se počítá z běžné ceny produktu.',
            width: '33%',
          },
        },
        {
          name: 'discountValidUntil',
          type: 'date',
          label: 'Sleva platí do',
          admin: {
            condition: (data) => Boolean(data?.discountType),
            date: {
              pickerAppearance: 'dayAndTime',
              timeIntervals: 15,
            },
            description: 'Po tomto datu a čase se znovu zobrazí běžná cena.',
            width: '34%',
          },
        },
      ],
    },
    {
      name: 'oldPrice',
      type: 'number',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'sku',
          type: 'text',
          label: 'SKU',
        },
        {
          name: 'stockQuantity',
          type: 'number',
          label: 'Skladové množství',
          defaultValue: 0,
          admin: {
            width: '50%',
          },
        },
        {
          name: 'purchaseCount',
          type: 'number',
          label: 'Počet nákupů',
          defaultValue: 0,
          min: 0,
          admin: {
            width: '50%',
            description: 'Používá se pro řazení produktů podle oblíbenosti na webu.',
          },
        },
      ],
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: 'Kategorie',
    },
    {
      name: 'categoryGroup',
      type: 'relationship',
      relationTo: 'category-groups',
      label: 'Skupina kategorií',
      filterOptions: ({ data }) => {
        if (data?.category) {
          return {
            category: {
              equals: data.category,
            },
          } as Where
        }

        return true
      },
      admin: {
        description: 'Druhá úroveň navigace používaná pro seskupená katalogová menu a landing pages kategorií.',
      },
    },
    {
      name: 'subcategories',
      type: 'relationship',
      relationTo: 'subcategories',
      hasMany: true,
      label: 'Podkategorie',
      filterOptions: ({ data }) => {
        if (data?.categoryGroup) {
          return {
            categoryGroup: {
              equals: data.categoryGroup,
            },
          } as Where
        }

        if (data?.category) {
          return {
            category: {
              equals: data.category,
            },
          } as Where
        }

        return true
      },
    },
    {
      name: 'mainImage',
      type: 'upload',
      hasMany: false,
      relationTo: 'media',
      label: 'Obrázek',
      validate: requireUploadedMedia,
      admin: {
        components: {
          Cell: '@/components/admin/products/ProductMainImageCell',
        },
        disableGroupBy: true,
        disableListFilter: true,
      },
    },
    {
      name: 'gallery',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      label: 'Galerie',
      admin: {
        description: 'Vyberte média zobrazovaná v galerii produktu na webu.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Popis',
          fields: [
            {
              name: 'descriptionContent',
              type: 'richText',
              label: 'Obsah',
              admin: {
                description: 'Plně upravitelný obsah pro první záložku „Popis“ na stránce produktu.',
              },
            },
          ],
        },
        {
          label: 'Specifikace',
          fields: [
            {
              name: 'specifications',
              type: 'array',
              label: 'Specifikace',
              fields: [
                {
                  name: 'key',
                  type: 'text',
                  required: true,
                  label: 'Pole',
                },
                {
                  name: 'value',
                  type: 'text',
                  required: true,
                  label: 'Hodnota',
                },
              ],
            },
          ],
        },
        {
          label: 'Horní odrážky',
          fields: [
            {
              name: 'highlights',
              type: 'array',
              label: 'Horní odrážky',
              admin: {
                description:
                  'Odrážky zobrazené pod dopravou a vrácením na stránce produktu. Oddělené od záložky „Specifikace / Další informace“.',
              },
              fields: [
                {
                  name: 'text',
                  type: 'text',
                  required: true,
                  label: 'Odrážka',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'productReviews',
      type: 'join',
      collection: 'product-reviews',
      on: 'product',
      label: 'Recenze produktu',
      admin: {
        allowCreate: false,
        defaultColumns: ['authorName', 'rating', 'show', 'submittedAt'],
      },
    },
    {
      name: 'variantProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Variantní produkty',
      admin: {
        description: 'Vyberte produkty, které se mají zobrazit v bloku barev a variant na stránce produktu.',
      },
    },
    {
      name: 'filterOptions',
      type: 'relationship',
      relationTo: 'filter-options',
      hasMany: true,
      label: 'Možnosti filtrů',
      admin: {
        description: 'Vyberte všechny možnosti filtrů, které se vztahují k tomuto produktu.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        {
          label: 'Koncept',
          value: 'draft',
        },
        {
          label: 'Publikováno',
          value: 'published',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      label: 'Zvýrazněný produkt',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isRecommended',
      type: 'checkbox',
      label: 'Doporučený produkt',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'deliveryTime',
      type: 'number',
      label: 'Dodací doba (dny)',
      admin: {
        description: 'Pokud je vyplněno, zobrazí se na webu text „Do X dnů“.',
        position: 'sidebar',
      },
    },
  ],
}
