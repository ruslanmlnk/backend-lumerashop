import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

export const Article: CollectionConfig = {
    slug: 'article',
    admin: {
        useAsTitle: 'title',
        defaultColumns: ['name', 'slug', 'sortOrder', 'isActive', 'updatedAt'],
    },
    access: {
        read: () => true,
    },
    fields: [
        slugField({
            useAsSlug: 'title',
        }),
        {
            name: 'title',
            type: 'text',
            required: true,
            label: 'Group name',
        },
        {
            name: 'mainImage',
            relationTo: 'media',
            type: 'upload',
            required: true,
            unique: true,
            label: 'Main image',
        },
        {
            name: 'description',
            type: 'textarea',
            label: 'Description',
        },

        {
            name: 'content',
            type: 'richText',
            label: 'Edit Content'
        }


    ],
}
