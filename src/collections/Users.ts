import type { CollectionConfig } from 'payload'

type UserAccessShape = {
  id?: number | string
  role?: string
  bonusBalance?: number | null
} | null

const asUser = (value: unknown): UserAccessShape => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  return value as UserAccessShape
}

const isAdminUser = (value: unknown) => asUser(value)?.role === 'admin'
const isCurrentUserOrAdmin = ({ req: { user } }: { req: { user?: unknown } }) => {
  const currentUser = asUser(user)

  if (currentUser?.role === 'admin') {
    return true
  }

  if (!currentUser?.id) {
    return false
  }

  return {
    id: {
      equals: currentUser.id,
    },
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Uživatel',
    plural: 'Uživatelé',
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'bonusBalance', 'updatedAt'],
  },
  auth: true,
  access: {
    read: isCurrentUserOrAdmin,
    create: () => true,
    update: ({ req: { user } }) => {
      const currentUser = asUser(user)

      if (currentUser?.role === 'admin') return true
      if (!currentUser?.id) return false

      return { id: { equals: currentUser.id } }
    },
    delete: ({ req: { user } }) => isAdminUser(user),
    admin: ({ req: { user } }) => isAdminUser(user),
  },
  fields: [
    {
      name: 'firstName',
      type: 'text',
      label: 'Jméno',
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'Příjmení',
    },
    {
      name: 'displayName',
      type: 'text',
      label: 'Zobrazované jméno',
    },
    {
      name: 'shippingAddress',
      type: 'group',
      label: 'Doručovací adresa',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'firstName',
              type: 'text',
              label: 'Jméno',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'lastName',
              type: 'text',
              label: 'Příjmení',
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'phone',
              type: 'text',
              label: 'Telefon',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'country',
              type: 'text',
              label: 'Země',
              defaultValue: 'CZ',
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'address',
          type: 'text',
          label: 'Ulice a číslo',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'city',
              type: 'text',
              label: 'Město',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'zip',
              type: 'text',
              label: 'PSČ',
              admin: {
                width: '50%',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'billingAddress',
      type: 'group',
      label: 'Fakturační adresa',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'firstName',
              type: 'text',
              label: 'Jméno',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'lastName',
              type: 'text',
              label: 'Příjmení',
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'phone',
              type: 'text',
              label: 'Telefon',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'country',
              type: 'text',
              label: 'Země',
              defaultValue: 'CZ',
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'address',
          type: 'text',
          label: 'Ulice a číslo',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'city',
              type: 'text',
              label: 'Město',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'zip',
              type: 'text',
              label: 'PSČ',
              admin: {
                width: '50%',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'companyName',
              type: 'text',
              label: 'Název firmy',
              admin: {
                width: '34%',
              },
            },
            {
              name: 'companyId',
              type: 'text',
              label: 'IČO',
              admin: {
                width: '33%',
              },
            },
            {
              name: 'vatId',
              type: 'text',
              label: 'DIČ',
              admin: {
                width: '33%',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'customer',
      required: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Zákazník', value: 'customer' },
      ],
      access: {
        update: ({ req: { user } }) => isAdminUser(user),
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'bonusBalance',
          type: 'number',
          label: 'Stav bonusů',
          defaultValue: 0,
          min: 0,
          admin: {
            width: '33%',
          },
        },
        {
          name: 'earnedBonusTotal',
          type: 'number',
          label: 'Celkem získané bonusy',
          defaultValue: 0,
          min: 0,
          admin: {
            width: '33%',
            readOnly: true,
          },
        },
        {
          name: 'spentBonusTotal',
          type: 'number',
          label: 'Celkem využité bonusy',
          defaultValue: 0,
          min: 0,
          admin: {
            width: '33%',
            readOnly: true,
          },
        },
      ],
    },
    {
      name: 'firstPurchaseDiscountUsed',
      type: 'checkbox',
      label: 'Sleva na první nákup využita',
      defaultValue: false,
      access: {
        update: ({ req: { user } }) => isAdminUser(user),
      },
      admin: {
        readOnly: true,
      },
    },
  ],
}
