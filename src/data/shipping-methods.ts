export type ShippingMethodId =
  | 'ppl-courier-cod'
  | 'ppl-pickup-cod'
  | 'ppl-courier'
  | 'ppl-pickup'
  | 'zasilkovna-courier'
  | 'zasilkovna-pickup'
  | 'personal-pickup'

export type PickupCarrier = 'ppl' | 'zasilkovna'

export type ShippingMethodPreset = {
  id: ShippingMethodId
  label: string
  description: string
  price: number
  sortOrder: number
  pickupCarrier?: PickupCarrier
  cashOnDelivery?: boolean
}

export function isCashOnDeliveryShippingMethod(
  method: Pick<ShippingMethodPreset, 'id' | 'label' | 'cashOnDelivery'>,
): boolean {
  return method.cashOnDelivery === true || method.id.endsWith('-cod') || method.label.toLowerCase().includes('na dobirku')
}

export const SHIPPING_METHOD_PRESETS: readonly ShippingMethodPreset[] = [
  {
    id: 'ppl-courier-cod',
    label: 'PPL - kuryr na dobirku',
    description: 'Doruceni bez dalsiho kroku vyberu pobocky.',
    price: 89,
    sortOrder: 10,
    cashOnDelivery: true,
  },
  {
    id: 'ppl-pickup-cod',
    label: 'PPL - vydejni mista na dobirku',
    description: 'Vyberete si konkretni misto nebo box.',
    price: 89,
    pickupCarrier: 'ppl',
    sortOrder: 20,
    cashOnDelivery: true,
  },
  {
    id: 'ppl-courier',
    label: 'PPL - kuryr',
    description: 'Doruceni bez dalsiho kroku vyberu pobocky.',
    price: 0,
    sortOrder: 30,
  },
  {
    id: 'ppl-pickup',
    label: 'PPL - vydejni mista',
    description: 'Vyberete si konkretni misto nebo box.',
    price: 0,
    pickupCarrier: 'ppl',
    sortOrder: 40,
  },
  {
    id: 'zasilkovna-courier',
    label: 'Zasilkovna - kuryr',
    description: 'Doruceni bez dalsiho kroku vyberu pobocky.',
    price: 0,
    sortOrder: 50,
  },
  {
    id: 'zasilkovna-pickup',
    label: 'Zasilkovna - vydejni mista',
    description: 'Vyberete si konkretni misto nebo box.',
    price: 0,
    pickupCarrier: 'zasilkovna',
    sortOrder: 60,
  },
  {
    id: 'personal-pickup',
    label: 'Osobni odber - Lisabonska 2394, Praha (vydejni misto)',
    description: 'Pripraveno k prevzeti na vydejnim miste v Praze.',
    price: 0,
    sortOrder: 70,
  },
]
