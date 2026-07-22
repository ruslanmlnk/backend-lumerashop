import type { Field } from 'payload'

export const catalogFilterVisibilityFields: Field[] = [
  {
    type: 'collapsible',
    label: 'Filtry na stránce: skrýt skupiny nebo hodnoty',
    admin: {
      initCollapsed: false,
    },
    fields: [
      {
        name: 'hiddenFilterGroups',
        type: 'relationship',
        relationTo: 'filter-groups',
        hasMany: true,
        filterOptions: {
          isActive: {
            equals: true,
          },
        },
        label: '1. Skrýt celé skupiny filtrů',
        admin: {
          allowCreate: false,
          allowEdit: true,
          isSortable: false,
          placeholder: 'Vyberte skupiny, které se nemají zobrazit',
          sortOptions: 'sortOrder',
          description:
            'Skryje celou skupinu včetně všech jejích hodnot, například Materiál nebo Barva. Pravidla se sčítají: nastavení kategorie platí i pro její skupiny a podkategorie.',
        },
      },
      {
        name: 'hiddenFilterOptions',
        type: 'relationship',
        relationTo: 'filter-options',
        hasMany: true,
        filterOptions: {
          isActive: {
            equals: true,
          },
        },
        label: '2. Skrýt pouze konkrétní hodnoty',
        admin: {
          allowCreate: false,
          allowEdit: true,
          isSortable: false,
          placeholder: 'Vyberte jednotlivé hodnoty, které se nemají zobrazit',
          sortOptions: 'sortOrder',
          description:
            'Skryje jen vybrané hodnoty, například Černá nebo Semišová kůže. Ostatní hodnoty stejné skupiny zůstanou viditelné. Toto nastavení se také dědí z vyšších úrovní.',
        },
      },
    ],
  },
]
