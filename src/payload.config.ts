import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { CategoryGroups } from './collections/CategoryGroups'
import { Subcategories } from './collections/Subcategories'
import { Products } from './collections/Products'
import { FilterGroups } from './collections/FilterGroups'
import { FilterOptions } from './collections/FilterOptions'
import { Article } from './collections/Article'
import { Orders } from './collections/Orders'
import { ShippingMethods } from './collections/ShippingMethods'

import { HomePage } from './globals/HomePage'


const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Categories, CategoryGroups, Subcategories, FilterGroups, FilterOptions, Products, Article, Orders, ShippingMethods],
  globals: [HomePage],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
