import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'

const ADMIN_EMAIL = 'adinfopresent@gmail.com'
const ADMIN_PASSWORD = '030306'

async function seedAdminUser() {
  const payload = await getPayload({ config })

  const existingUsers = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      email: {
        equals: ADMIN_EMAIL,
      },
    },
  })

  const existingUser = existingUsers.docs[0]

  if (existingUser) {
    await payload.update({
      collection: 'users',
      id: existingUser.id,
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
      },
      depth: 0,
      overrideAccess: true,
    } as never)

    console.log(`Updated admin user ${ADMIN_EMAIL}`)
    return
  }

  await payload.create({
    collection: 'users',
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
    },
    depth: 0,
    overrideAccess: true,
  } as never)

  console.log(`Created admin user ${ADMIN_EMAIL}`)
}

seedAdminUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
