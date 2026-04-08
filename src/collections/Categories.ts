import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { catalogFilterVisibilityFields } from '../fields/catalogFilterVisibilityFields'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: 'Kategorie',
    plural: 'Kategorie',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'showInDesktopMenu', 'showInDesktopDropdownMenu', 'showInMobileMenu', 'sortOrder', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Název kategorie',
    },
    slugField({
      useAsSlug: 'name',
    }),
    {
      name: 'showInMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Původní viditelnost v menu',
      admin: {
        hidden: true,
        position: 'sidebar',
        description: 'Původní přepínač viditelnosti ponechaný jen kvůli zpětné kompatibilitě.',
      },
    },
    {
      name: 'showInDesktopMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Zobrazit v desktopovém menu',
      admin: {
        position: 'sidebar',
        description: 'Zobrazí tuto kategorii v hlavním menu kategorií na desktopu.',
      },
    },
    {
      name: 'showInDesktopDropdownMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Zobrazit v doplňkovém desktopovém menu',
      admin: {
        position: 'sidebar',
        description: 'Přesune tuto desktopovou kategorii z hlavní řady hlavičky do doplňkového rozbalovacího menu.',
      },
    },
    {
      name: 'showInMobileMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Zobrazit v mobilním menu',
      admin: {
        position: 'sidebar',
        description: 'Zobrazí tuto kategorii v mobilní navigaci.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      label: 'Pořadí',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Popis',
    },
    ...catalogFilterVisibilityFields,
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Obrázek kategorie',
    },
  ],
}
