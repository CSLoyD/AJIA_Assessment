import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const names = ['Alice', 'Bob', 'Carol']

  for (const name of names) {
    await prisma.user.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  console.log(`Seeded users: ${names.join(', ')}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
