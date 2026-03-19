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
      label: 'First Name',
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'Last Name',
    },
    {
      name: 'displayName',
      type: 'text',
      label: 'Display Name',
    },
    {
      name: 'shippingAddress',
      type: 'group',
      label: 'Shipping address',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'firstName',
              type: 'text',
              label: 'First Name',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'lastName',
              type: 'text',
              label: 'Last Name',
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
              label: 'Phone',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'country',
              type: 'text',
              label: 'Country',
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
          label: 'Street address',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'city',
              type: 'text',
              label: 'City',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'zip',
              type: 'text',
              label: 'ZIP',
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
      label: 'Billing address',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'firstName',
              type: 'text',
              label: 'First Name',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'lastName',
              type: 'text',
              label: 'Last Name',
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
              label: 'Phone',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'country',
              type: 'text',
              label: 'Country',
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
          label: 'Street address',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'city',
              type: 'text',
              label: 'City',
              admin: {
                width: '50%',
              },
            },
            {
              name: 'zip',
              type: 'text',
              label: 'ZIP',
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
              label: 'Company name',
              admin: {
                width: '34%',
              },
            },
            {
              name: 'companyId',
              type: 'text',
              label: 'Company ID',
              admin: {
                width: '33%',
              },
            },
            {
              name: 'vatId',
              type: 'text',
              label: 'VAT ID',
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
        { label: 'Customer', value: 'customer' },
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
          label: 'Bonus balance',
          defaultValue: 0,
          min: 0,
          admin: {
            width: '33%',
          },
        },
        {
          name: 'earnedBonusTotal',
          type: 'number',
          label: 'Earned bonus total',
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
          label: 'Spent bonus total',
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
      label: 'First purchase discount used',
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
