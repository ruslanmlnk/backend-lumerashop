import type { Field } from 'payload'

export const seo: Field = {
    name: 'seo',
    type: 'group',
    label: 'SEO',
    fields: [
        {
            name: 'title',
            type: 'text',
            label: 'SEO Title',
        },
        {
            name: 'description',
            type: 'textarea',
            label: 'SEO Description',
        },
    ],
}
