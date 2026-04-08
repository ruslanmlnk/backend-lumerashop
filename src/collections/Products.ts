import type { CollectionConfig, Where } from 'payload'
import { slugField } from 'payload'

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

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: 'Produkt',
    plural: 'Produkty',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: [
      'mainImage',
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
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Název produktu',
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
        },
        {
          name: 'oldPrice',
          type: 'number',
          label: 'Původní cena',
        },
      ],
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
      label: 'Krátký popis',
      admin: {
        description: 'Krátký úvod zobrazený vedle názvu produktu.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Textový popis',
      admin: {
        description: 'Prostý text používaný pro shrnutí, fallbacky a feedy.',
      },
    },
    {
      name: 'descriptionContent',
      type: 'richText',
      label: 'Obsah záložky Popis',
      admin: {
        description: 'Plně upravitelný obsah pro první záložku „Popis“ na stránce produktu.',
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
      type: 'array',
      label: 'Galerie',
      admin: {
        description: 'Přidejte obrázky nebo videa zobrazovaná v galerii produktu na webu.',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          hasMany: false,
          relationTo: 'media',
          label: 'Médium',
          validate: requireUploadedMedia,
        },
      ],
    },
    {
      name: 'highlights',
      type: 'array',
      label: 'Horní odrážky',
      admin: {
        description: 'Odrážky zobrazené pod dopravou a vrácením na stránce produktu. Oddělené od záložky „Specifikace / Další informace“.',
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
