import type { CollectionConfig } from 'payload'

type UserAccessShape = {
  id?: number | string
  role?: string
} | null

const asUser = (value: unknown): UserAccessShape => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  return value as UserAccessShape
}

const isAdminUser = (value: unknown) => asUser(value)?.role === 'admin'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    read: () => true,
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
  ],
}
