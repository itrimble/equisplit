import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@equisplit.com' },
    update: {},
    create: {
      email: 'test@equisplit.com',
      name: 'Test User',
      subscriptionTier: 'FREE',
      mfaEnabled: false,
    },
  })

  console.log('✅ Created test user:', testUser.email)

  // Create sample calculation
  const calculation = await prisma.calculation.create({
    data: {
      userId: testUser.id,
      title: 'Sample California Divorce',
      jurisdiction: 'CA',
      propertyRegime: 'COMMUNITY',
      status: 'DRAFT',
      marriageDate: new Date('2015-06-15'),
      separationDate: new Date('2024-03-01'),
      hasPrenup: false,
      specialCircumstances: ['High-income earners', 'Real estate holdings'],
    },
  })

  console.log('✅ Created sample calculation')

  // Create sample assets
  const assets = await prisma.asset.createMany({
    data: [
      {
        userId: testUser.id,
        calculationId: calculation.id,
        type: 'REAL_ESTATE',
        description: 'Family Home - 123 Main St',
        currentValue: 850000,
        acquisitionDate: new Date('2016-01-15'),
        acquisitionValue: 650000,
        isSeparateProperty: false,
        ownedBy: 'JOINT',
      },
      {
        userId: testUser.id,
        calculationId: calculation.id,
        type: 'RETIREMENT_ACCOUNT',
        description: '401(k) - Spouse 1',
        currentValue: 125000,
        isSeparateProperty: false,
        ownedBy: 'SPOUSE1',
      },
      {
        userId: testUser.id,
        calculationId: calculation.id,
        type: 'BANK_ACCOUNT',
        description: 'Joint Checking Account',
        currentValue: 15000,
        isSeparateProperty: false,
        ownedBy: 'JOINT',
      },
    ],
  })

  console.log('✅ Created sample assets')

  // Create sample debts
  const debts = await prisma.debt.createMany({
    data: [
      {
        userId: testUser.id,
        calculationId: calculation.id,
        type: 'MORTGAGE',
        description: 'Home Mortgage - 123 Main St',
        currentBalance: 425000,
        originalAmount: 520000,
        acquisitionDate: new Date('2016-01-15'),
        isSeparateProperty: false,
        responsibility: 'JOINT',
      },
      {
        userId: testUser.id,
        calculationId: calculation.id,
        type: 'CREDIT_CARD',
        description: 'Joint Credit Card',
        currentBalance: 8500,
        isSeparateProperty: false,
        responsibility: 'JOINT',
      },
    ],
  })

  console.log('✅ Created sample debts')

  console.log('🎉 Database seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })