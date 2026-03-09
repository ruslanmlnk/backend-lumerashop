import type { CollectionConfig } from 'payload'

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
      if ((user as any)?.role === 'admin') return true
      return { id: { equals: user?.id } }
    },
    delete: ({ req: { user } }) => (user as any)?.role === 'admin',
    admin: ({ req: { user } }) => (user as any)?.role === 'admin',
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
        update: ({ req: { user } }) => (user as any)?.role === 'admin',
      },
    },
  ],
}
