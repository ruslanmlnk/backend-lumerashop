export type CategoryHierarchySeed = {
  name: string
  showInMenu?: boolean
  groups?: CategoryGroupSeed[]
}

export type CategoryGroupSeed = {
  name: string
  showInMenu?: boolean
  subcategories?: CategorySubcategorySeed[]
}

export type CategorySubcategorySeed = {
  name: string
  showInMenu?: boolean
}

// Workbook-derived hierarchy from the root spreadsheet.
export const categoryHierarchySeed: CategoryHierarchySeed[] = [
  {
    name: 'Dámské kabelky',
    showInMenu: false,
    groups: [
      {
        name: 'Podle druhu',
        showInMenu: false,
        subcategories: [
          { name: 'Kabelky do ruky', showInMenu: false },
          { name: 'Trendové kabelky', showInMenu: false },
          { name: 'Luxusní kabelky', showInMenu: false },
          { name: 'Kabelky přes rameno', showInMenu: false },
          { name: 'Střední kabelky', showInMenu: false },
          { name: 'Velké kabelky', showInMenu: false },
          { name: 'Malé kabelky', showInMenu: false },
          { name: 'Shopper kabelky', showInMenu: false },
          { name: 'Batůžky', showInMenu: false },
          { name: 'Crossbody kabelky', showInMenu: false },
          { name: 'Cestovní tašky', showInMenu: false },
          { name: 'S řetízkovým popruhem', showInMenu: false },
          { name: 'Kabelky s třásněmi', showInMenu: false },
          { name: 'Kabelky s kožešinou', showInMenu: false },
        ],
      },
      {
        name: 'Podle barvy',
        showInMenu: false,
        subcategories: [
          { name: 'Tmavě hnědá', showInMenu: false },
          { name: 'Černá', showInMenu: false },
          { name: 'Taupe', showInMenu: false },
          { name: 'Hnědá', showInMenu: false },
          { name: 'Koňak', showInMenu: false },
          { name: 'Vínová', showInMenu: false },
          { name: 'Šedá', showInMenu: false },
          { name: 'Béžová', showInMenu: false },
          { name: 'Červená', showInMenu: false },
          { name: 'Modrá', showInMenu: false },
        ],
      },
      {
        name: 'Podle materiálu',
        showInMenu: false,
        subcategories: [
          { name: 'Kožené', showInMenu: false },
          { name: 'Semišové', showInMenu: false },
        ],
      },
    ],
  },
  {
    name: 'Pánské tašky',
    showInMenu: false,
    groups: [
      {
        name: 'Podle druhu',
        showInMenu: false,
        subcategories: [
          { name: 'Cestovní tašky', showInMenu: false },
          { name: 'Batohy', showInMenu: false },
          { name: 'Tašky na notebook', showInMenu: false },
          { name: 'Tašky přes rameno', showInMenu: false },
        ],
      },
      {
        name: 'Podle barvy',
        showInMenu: false,
        subcategories: [
          { name: 'Tmavě hnědá', showInMenu: false },
          { name: 'Černá', showInMenu: false },
          { name: 'Hnědá', showInMenu: false },
        ],
      },
    ],
  },
  {
    name: 'Batohy',
    showInMenu: false,
    groups: [
      { name: 'Pánské batohy', showInMenu: false },
      { name: 'Dámské batohy', showInMenu: false },
    ],
  },
  {
    name: 'Doplňky',
    showInMenu: false,
    groups: [
      {
        name: 'Peněženky',
        showInMenu: false,
        subcategories: [
          { name: 'Dámské peněženky', showInMenu: false },
          { name: 'Pánské peněženky', showInMenu: false },
        ],
      },
      {
        name: 'Opasky',
        showInMenu: false,
        subcategories: [{ name: 'Dámské opasky', showInMenu: false }],
      },
    ],
  },
  {
    name: 'Nová šance',
    showInMenu: false,
  },
  {
    name: 'Dárkové poukazy',
    showInMenu: false,
  },
  {
    name: 'Akce',
    showInMenu: false,
  },
  {
    name: 'Novinky',
    showInMenu: false,
  },
]

