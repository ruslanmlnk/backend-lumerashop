import type { GlobalConfig } from 'payload'

import { DEFAULT_HOME_TESTIMONIALS, DEFAULT_HOME_TESTIMONIALS_TITLE } from '../data/home-page-defaults'
import { seo } from '../fields/seo'

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Domovská stránka',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'aboutSection',
      type: 'group',
      label: 'Sekce O nás (blok s videem)',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Nadpis',
          required: true,
          defaultValue: 'O obchodě Lumera',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Popis',
          required: true,
          defaultValue:
            'Lumera je český obchod s italskými koženými kabelkami a doplňky.\nSpolupracujeme s menšími výrobci z Itálie, kteří si zakládají na kvalitě a ručním zpracování. Každý model pečlivě vybíráme tak, aby spojoval eleganci, praktičnost a originalitu. Věříme, že krása je v detailu, stejně jako v každé kabelce, kterou nabízíme.',
        },
        {
          name: 'buttonText',
          type: 'text',
          label: 'Text tlačítka',
          required: true,
          defaultValue: 'Zjistit více o obchodě',
        },
        {
          name: 'buttonLink',
          type: 'text',
          label: 'Odkaz tlačítka',
          required: true,
          defaultValue: '/o-nas',
        },
      ],
    },
    {
      name: 'marketingSlides',
      type: 'array',
      label: 'Marketingový slider',
      labels: {
        singular: 'Snímek',
        plural: 'Snímky',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Nadpis',
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          label: 'Popis',
        },
        {
          name: 'button',
          type: 'text',
          required: true,
          label: 'Popisek tlačítka',
        },
        {
          name: 'link',
          type: 'text',
          required: true,
          label: 'Odkaz tlačítka',
        },
        {
          name: 'bg',
          type: 'text',
          required: true,
          label: 'URL obrázku pozadí',
        },
        {
          name: 'overlayImage',
          type: 'text',
          required: true,
          label: 'URL překryvného obrázku',
        },
        {
          name: 'layout',
          type: 'group',
          label: 'Rozložení pro desktop',
          fields: [
            {
              name: 'paddingTop',
              type: 'number',
              required: true,
              label: 'Horní odsazení',
            },
            {
              name: 'titleMaxWidth',
              type: 'number',
              required: true,
              label: 'Maximální šířka nadpisu',
            },
            {
              name: 'descMaxWidth',
              type: 'number',
              required: true,
              label: 'Maximální šířka popisu',
            },
            {
              name: 'img',
              type: 'group',
              label: 'Pozice překryvného obrázku',
              fields: [
                {
                  name: 'w',
                  type: 'number',
                  required: true,
                  label: 'Šířka obrázku',
                },
                {
                  name: 'h',
                  type: 'number',
                  required: true,
                  label: 'Výška obrázku',
                },
                {
                  name: 'top',
                  type: 'number',
                  required: true,
                  label: 'Horní pozice obrázku',
                },
                {
                  name: 'right',
                  type: 'number',
                  required: true,
                  label: 'Pravá pozice obrázku',
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
      label: 'Sekce recenzí',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Nadpis sekce',
          required: true,
          defaultValue: DEFAULT_HOME_TESTIMONIALS_TITLE,
        },
        {
          name: 'items',
          type: 'array',
          label: 'Recenze',
          labels: {
            singular: 'Recenze',
            plural: 'Recenze',
          },
          defaultValue: DEFAULT_HOME_TESTIMONIALS,
          fields: [
            {
              name: 'text',
              type: 'textarea',
              label: 'Komentář',
              required: true,
            },
            {
              name: 'author',
              type: 'text',
              label: 'Autor',
              required: true,
            },
            {
              name: 'location',
              type: 'text',
              label: 'Lokalita',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'blogSection',
      type: 'group',
      label: 'Sekce blogu',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Nadpis sekce',
          defaultValue: 'Z blogu Lumera',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Popis sekce',
          defaultValue: 'Styl, inspirace a péče o vaše kožené doplňky.',
        },
        {
          name: 'featuredArticles',
          type: 'relationship',
          relationTo: 'article',
          hasMany: true,
          label: 'Články na domovské stránce',
          admin: {
            description: 'Vyberte a seřaďte články pro blogovou sekci na domovské stránce. Ponechte prázdné, pokud se blok nemá zobrazit.',
          },
        },
      ],
    },
    {
      name: 'requirePurchaseForReview',
      type: 'checkbox',
      label: 'Vyžadovat nákup před recenzí',
      defaultValue: false,
      admin: {
        description: 'Pokud je zapnuto, uživatelé mohou psát recenze jen k produktům, které si zakoupili.',
      },
    },
    seo,
  ],
}
