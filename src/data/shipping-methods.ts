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
}

export const SHIPPING_METHOD_PRESETS: readonly ShippingMethodPreset[] = [
  {
    id: 'ppl-courier-cod',
    label: 'PPL - kurýr na dobírku',
    description: 'Doručení bez dalšího kroku výběru pobočky.',
    price: 0,
    sortOrder: 10,
  },
  {
    id: 'ppl-pickup-cod',
    label: 'PPL - Výdejní místa na dobírku',
    description: 'Vyberete si konkrétní místo nebo box.',
    price: 0,
    pickupCarrier: 'ppl',
    sortOrder: 20,
  },
  {
    id: 'ppl-courier',
    label: 'PPL - kurýr',
    description: 'Doručení bez dalšího kroku výběru pobočky.',
    price: 0,
    sortOrder: 30,
  },
  {
    id: 'ppl-pickup',
    label: 'PPL - Výdejní místa',
    description: 'Vyberete si konkrétní místo nebo box.',
    price: 0,
    pickupCarrier: 'ppl',
    sortOrder: 40,
  },
  {
    id: 'zasilkovna-courier',
    label: 'Zásilkovna - kurýr',
    description: 'Doručení bez dalšího kroku výběru pobočky.',
    price: 0,
    sortOrder: 50,
  },
  {
    id: 'zasilkovna-pickup',
    label: 'Zásilkovna - Výdejní místa',
    description: 'Vyberete si konkrétní místo nebo box.',
    price: 0,
    pickupCarrier: 'zasilkovna',
    sortOrder: 60,
  },
  {
    id: 'personal-pickup',
    label: 'Osobní odběr - Lisabonská 2394, Praha (Výdejní místo)',
    description: 'Připraveno k převzetí na výdejním místě v Praze.',
    price: 0,
    sortOrder: 70,
  },
]
