import type { GlobalConfig } from 'payload'

import { DEFAULT_HOME_TESTIMONIALS, DEFAULT_HOME_TESTIMONIALS_TITLE } from '../data/home-page-defaults'
import { seo } from '../fields/seo'

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Home Page',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'aboutSection',
      type: 'group',
      label: 'About section (block with video)',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
          required: true,
          defaultValue: 'O obchodě Lumera',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description',
          required: true,
          defaultValue:
            'Lumera je český obchod s italskými koženými kabelkami a doplňky.\nSpolupracujeme s menšími výrobci z Itálie, kteří si zakládají na kvalitě a ručním zpracování. Každý model pečlivě vybíráme tak, aby spojoval eleganci, praktičnost a originalitu. Věříme, že krása je v detailu, stejně jako v každé kabelce, kterou nabízíme.',
        },
        {
          name: 'buttonText',
          type: 'text',
          label: 'Button text',
          required: true,
          defaultValue: 'Zjistit více o obchodě',
        },
        {
          name: 'buttonLink',
          type: 'text',
          label: 'Button link',
          required: true,
          defaultValue: '/o-nas',
        },
      ],
    },
    {
      name: 'marketingSlides',
      type: 'array',
      label: 'Marketing slider',
      labels: {
        singular: 'Slide',
        plural: 'Slides',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Title',
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          label: 'Description',
        },
        {
          name: 'button',
          type: 'text',
          required: true,
          label: 'Button label',
        },
        {
          name: 'link',
          type: 'text',
          required: true,
          label: 'Button link',
        },
        {
          name: 'bg',
          type: 'text',
          required: true,
          label: 'Background image URL',
        },
        {
          name: 'overlayImage',
          type: 'text',
          required: true,
          label: 'Overlay image URL',
        },
        {
          name: 'layout',
          type: 'group',
          label: 'Desktop layout',
          fields: [
            {
              name: 'paddingTop',
              type: 'number',
              required: true,
              label: 'Top offset',
            },
            {
              name: 'titleMaxWidth',
              type: 'number',
              required: true,
              label: 'Title max width',
            },
            {
              name: 'descMaxWidth',
              type: 'number',
              required: true,
              label: 'Description max width',
            },
            {
              name: 'img',
              type: 'group',
              label: 'Overlay image position',
              fields: [
                {
                  name: 'w',
                  type: 'number',
                  required: true,
                  label: 'Image width',
                },
                {
                  name: 'h',
                  type: 'number',
                  required: true,
                  label: 'Image height',
                },
                {
                  name: 'top',
                  type: 'number',
                  required: true,
                  label: 'Image top',
                },
                {
                  name: 'right',
                  type: 'number',
                  required: true,
                  label: 'Image right',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'testimonialsSection',
      type: 'group',
      label: 'Testimonials section',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Section title',
          required: true,
          defaultValue: DEFAULT_HOME_TESTIMONIALS_TITLE,
        },
        {
          name: 'items',
          type: 'array',
          label: 'Testimonials',
          labels: {
            singular: 'Testimonial',
            plural: 'Testimonials',
          },
          defaultValue: DEFAULT_HOME_TESTIMONIALS,
          fields: [
            {
              name: 'text',
              type: 'textarea',
              label: 'Comment',
              required: true,
            },
            {
              name: 'author',
              type: 'text',
              label: 'Author',
              required: true,
            },
            {
              name: 'location',
              type: 'text',
              label: 'Location',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'blogSection',
      type: 'group',
      label: 'Blog section',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Section title',
          defaultValue: 'Z blogu Lumera',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Section description',
          defaultValue: 'Styl, inspirace a péče o vaše kožené doplňky.',
        },
        {
          name: 'featuredArticles',
          type: 'relationship',
          relationTo: 'article',
          hasMany: true,
          label: 'Articles to show on homepage',
          admin: {
            description: 'Choose and order the articles for the homepage blog section. Leave empty to hide the block.',
          },
        },
      ],
    },
    {
      name: 'requirePurchaseForReview',
      type: 'checkbox',
      label: 'Require purchase before review',
      defaultValue: false,
      admin: {
        description: 'If enabled, users can only leave reviews on products they have purchased.',
      },
    },
    seo,
  ],
}
