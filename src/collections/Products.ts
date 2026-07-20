import type { CollectionBeforeChangeHook, CollectionConfig, PayloadRequest, Where } from 'payload'
import { slugField } from 'payload'

import {
  clampProductDiscountPercent,
  normalizeProductDiscountType,
  normalizeProductDiscountValidUntil,
  normalizeProductPricingData,
  resolveProductPricing,
  resolveStoredProductRegularPrice,
} from '@/lib/product-pricing'
import { slugifyValue } from '@/utilities/slugify'

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

type RelationID = number | string

type AutoFilterSourceDoc = {
  id?: number | string
  name?: string | null
  productFilterOptions?: unknown
}

type AutoFilterOptionDoc = {
  id?: number | string
  name?: string | null
}

const SALE_CATEGORY_NAME = 'Akce'
const SALE_CATEGORY_SLUG = 'akce'

const asRelationID = (value: unknown): RelationID | null => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  if (typeof value === 'object' && value !== null && 'id' in value) {
    const relationID = value.id

    if (typeof relationID === 'number' && Number.isInteger(relationID)) {
      return relationID
    }

    if (typeof relationID === 'string' && relationID.trim().length > 0) {
      return relationID.trim()
    }
  }

  return null
}

const parseRelationIDs = (value: unknown): RelationID[] => {
  const values = Array.isArray(value) ? value : [value]

  return values
    .map((entry) => asRelationID(entry))
    .filter((entry): entry is RelationID => entry !== null)
}

const uniqueRelationIDs = (values: RelationID[]) =>
  Array.from(new Map(values.map((value) => [String(value), value])).values())

const normalizeFilterName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const getRelationValuesForSave = (data: Record<string, unknown>, originalDoc: Record<string, unknown> | undefined, field: string) =>
  data[field] !== undefined ? data[field] : originalDoc?.[field]

const fetchSaleCategoryID = async (req: PayloadRequest): Promise<RelationID | null> => {
  const result = await req.payload.find({
    collection: 'categories',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    select: {
      name: true,
      slug: true,
    },
    where: {
      or: [
        {
          slug: {
            equals: SALE_CATEGORY_SLUG,
          },
        },
        {
          name: {
            equals: SALE_CATEGORY_NAME,
          },
        },
      ],
    },
  })

  return asRelationID(result.docs[0])
}

const fetchAutoFilterSourceDocs = async (
  req: PayloadRequest,
  collection: 'categories' | 'category-groups' | 'subcategories',
  ids: RelationID[],
) => {
  if (ids.length === 0) {
    return []
  }

  const result = await req.payload.find({
    collection,
    depth: 1,
    limit: ids.length,
    overrideAccess: true,
    req,
    where: {
      id: {
        in: ids,
      },
    },
    select: {
      name: true,
      productFilterOptions: true,
    },
  })

  return result.docs as AutoFilterSourceDoc[]
}

const applyAutomaticSaleCategory = async (
  args: Parameters<CollectionBeforeChangeHook>[0],
  productData: Record<string, unknown>,
) => {
  const originalData =
    args.originalDoc && typeof args.originalDoc === 'object'
      ? (args.originalDoc as Record<string, unknown>)
      : undefined
  const pricing = resolveProductPricing({
    ...(originalData || {}),
    ...productData,
  })

  if (!pricing.isDiscountActive) {
    return productData
  }

  const saleCategoryID = await fetchSaleCategoryID(args.req)

  if (saleCategoryID === null) {
    return productData
  }

  const currentCategoryIDs = parseRelationIDs(
    getRelationValuesForSave(productData, originalData, 'category'),
  )
  const nextCategoryIDs = uniqueRelationIDs([...currentCategoryIDs, saleCategoryID])

  if (nextCategoryIDs.length === currentCategoryIDs.length) {
    return productData
  }

  return {
    ...productData,
    category: nextCategoryIDs,
  }
}

const fetchSameNameFilterOptionIDs = async (
  req: PayloadRequest,
  names: string[],
) => {
  const normalizedNames = new Set(names.map((name) => normalizeFilterName(name)).filter(Boolean))

  if (normalizedNames.size === 0) {
    return []
  }

  const result = await req.payload.find({
    collection: 'filter-options',
    depth: 0,
    limit: 2000,
    overrideAccess: true,
    req,
    select: {
      name: true,
    },
  })

  return (result.docs as AutoFilterOptionDoc[])
    .filter((option) => typeof option.name === 'string' && normalizedNames.has(normalizeFilterName(option.name)))
    .map((option) => option.id)
    .filter((id): id is RelationID => typeof id === 'number' || typeof id === 'string')
}

const applyAutomaticProductFilterOptions = async (
  args: Parameters<CollectionBeforeChangeHook>[0],
) => {
  const { data, originalDoc, req } = args

  if (!data || typeof data !== 'object') {
    return data
  }

  const originalData =
    originalDoc && typeof originalDoc === 'object' ? (originalDoc as Record<string, unknown>) : undefined
  const productData = data as Record<string, unknown>
  const categoryIDs = parseRelationIDs(getRelationValuesForSave(productData, originalData, 'category'))
  const categoryGroupIDs = parseRelationIDs(getRelationValuesForSave(productData, originalData, 'categoryGroup'))
  const subcategoryIDs = parseRelationIDs(getRelationValuesForSave(productData, originalData, 'subcategories'))

  const [categoryDocs, categoryGroupDocs, subcategoryDocs] = await Promise.all([
    fetchAutoFilterSourceDocs(req, 'categories', categoryIDs),
    fetchAutoFilterSourceDocs(req, 'category-groups', categoryGroupIDs),
    fetchAutoFilterSourceDocs(req, 'subcategories', subcategoryIDs),
  ])
  const sourceDocs = [...categoryDocs, ...categoryGroupDocs, ...subcategoryDocs]
  const explicitFilterOptionIDs = sourceDocs.flatMap((doc) => parseRelationIDs(doc.productFilterOptions))
  const sourceNames = sourceDocs
    .map((doc) => (typeof doc.name === 'string' ? doc.name.trim() : ''))
    .filter((name): name is string => Boolean(name))
  const sameNameFilterOptionIDs = await fetchSameNameFilterOptionIDs(req, sourceNames)
  const currentFilterOptionIDs = parseRelationIDs(
    getRelationValuesForSave(productData, originalData, 'filterOptions'),
  )
  const mergedFilterOptionIDs = uniqueRelationIDs([
    ...currentFilterOptionIDs,
    ...explicitFilterOptionIDs,
    ...sameNameFilterOptionIDs,
  ])

  return {
    ...productData,
    filterOptions: mergedFilterOptionIDs,
  }
}

const buildRelationFilter = (field: string, value: unknown): Where | true => {
  const ids = parseRelationIDs(value)

  if (ids.length === 0) {
    return true
  }

  return {
    [field]: ids.length === 1 ? { equals: ids[0] } : { in: ids },
  } as Where
}

export const Products: CollectionConfig = {
  slug: 'products',
  defaultSort: '-createdAt',
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
      'createdAt',
    ],
  },
  hooks: {
    beforeChange: [
      async (args) => {
        if (!args.data || typeof args.data !== 'object') {
          return args.data
        }

        const originalDoc =
          args.originalDoc && typeof args.originalDoc === 'object'
            ? (args.originalDoc as Record<string, unknown>)
            : undefined
        const normalizedData = normalizeProductPricingData(
          args.data as Record<string, unknown>,
          originalDoc,
        )
        const dataWithSaleCategory = await applyAutomaticSaleCategory(args, normalizedData)

        return applyAutomaticProductFilterOptions({
          ...args,
          data: dataWithSaleCategory,
        })
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
      slugify: ({ valueToSlugify }) => slugifyValue(valueToSlugify),
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
      hasMany: true,
      required: true,
      label: 'Kategorie',
    },
    {
      name: 'categoryGroup',
      type: 'relationship',
      relationTo: 'category-groups',
      hasMany: true,
      label: 'Skupina kategorií',
      filterOptions: ({ data }) => {
        if (data?.category) {
          return buildRelationFilter('category', data.category)
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
          return buildRelationFilter('categoryGroup', data.categoryGroup)
        }

        if (data?.category) {
          return buildRelationFilter('categories', data.category)
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
              name: 'highlightsContent',
              type: 'richText',
              label: 'Horni odrazky',
              admin: {
                description:
                  'Text zobrazeny pod dopravou a vracenim na strance produktu. Muzete vlozit seznam, odstavce, odkazy i dalsi formatovani.',
              },
            },
            {
              name: 'highlights',
              type: 'array',
              label: 'Horní odrážky',
              admin: {
                hidden: true,
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
