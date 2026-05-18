import { PrismaClient, Role, ProduceStatus, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean up existing data (Order matters to prevent foreign key violations)
  console.log('Clearing old data...');
  await prisma.ledgerEntry.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.produce.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.cooperative.deleteMany({});

  // 2. Seed Cooperatives
  console.log('Seeding cooperatives...');
  const coopMeru = await prisma.cooperative.create({
    data: { name: 'Meru Coffee Farmers Coop', region: 'Meru County' },
  });
  const coopNyeri = await prisma.cooperative.create({
    data: { name: 'Nyeri Tea Growers Coop', region: 'Nyeri County' },
  });

  // 3. Seed Users (Super Admin, Regulator, Coop Admin, Buyer, Farmers)
  console.log('Seeding users...');
  
  // A dummy hashed password (e.g., for 'password123')
  const dummyHash = '$2b$10$EPY90vEgIatYhEHYqZcCEu.wN9pkyK089Wv1I6d7wOQ0mGWh7lD6C';

  const superAdmin = await prisma.user.create({
    data: {
      phone: '+254700000001',
      email: 'admin@agriledger.com',
      passwordHash: dummyHash,
      role: Role.SUPER_ADMIN,
    },
  });

  const regulator = await prisma.user.create({
    data: {
      phone: '+254700000002',
      email: 'regulator@authority.go.ke',
      passwordHash: dummyHash,
      role: Role.REGULATOR,
    },
  });

  const coopAdmin = await prisma.user.create({
    data: {
      phone: '+254700000003',
      email: 'manager@merucoop.com',
      passwordHash: dummyHash,
      role: Role.COOP_ADMIN,
      cooperativeId: coopMeru.id,
    },
  });

  const buyer = await prisma.user.create({
    data: {
      phone: '+254711222333',
      email: 'sourcing@globalexports.com',
      passwordHash: dummyHash,
      role: Role.BUYER,
    },
  });

  const farmer1 = await prisma.user.create({
    data: {
      phone: '+254722111222',
      email: 'john.muriuki@gmail.com',
      passwordHash: dummyHash,
      role: Role.FARMER,
      nationalId: '12345678',
      cooperativeId: coopMeru.id,
    },
  });

  const farmer2 = await prisma.user.create({
    data: {
      phone: '+254733444555',
      email: 'mary.wambui@gmail.com',
      passwordHash: dummyHash,
      role: Role.FARMER,
      nationalId: '87654321',
      cooperativeId: coopNyeri.id,
    },
  });

  // 4. Seed Produce listings
  console.log('Seeding produce...');
  const produce1 = await prisma.produce.create({
    data: {
      farmerId: farmer1.id,
      crop: 'Coffee (SL28)',
      gradeCode: 'AA',
      weightKg: 250.00,
      pricePerKg: 4.50,
      harvestDate: new Date('2026-04-15'),
      county: 'Meru',
      status: ProduceStatus.SOLD, // Marked as sold because it will be tied to a finished transaction
      iotSensorId: 'IOT-MERU-098',
    },
  });

  const produce2 = await prisma.produce.create({
    data: {
      farmerId: farmer2.id,
      crop: 'Green Tea Leaves',
      gradeCode: 'G1',
      weightKg: 500.00,
      pricePerKg: 2.20,
      harvestDate: new Date('2026-05-10'),
      county: 'Nyeri',
      status: ProduceStatus.AVAILABLE,
      iotSensorId: 'IOT-NYERI-441',
    },
  });

  // 5. Seed Transactions
  console.log('Seeding transactions...');
  const tx1 = await prisma.transaction.create({
    data: {
      farmerId: farmer1.id,
      buyerId: buyer.id,
      produceId: produce1.id,
      weightKg: 250.00,
      pricePerKg: 4.50,
      totalAmount: 1125.00, // 250 * 4.50
      status: TransactionStatus.CONFIRMED,
      onChainHash: '0x74a2f8b5c139c8651a021884dc4783cbcf62ecf09ab978160492167d4f9bf8a2',
      blockNumber: '19452031',
      confirmedAt: new Date('2026-04-18'),
    },
  });

  // 6. Seed Ledger Entries (Blockchain anchors)
  console.log('Seeding ledger entries...');
  await prisma.ledgerEntry.create({
    data: {
      transactionId: tx1.id,
      dataHash: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      onChainHash: tx1.onChainHash!,
      blockNumber: tx1.blockNumber!,
      contractAddress: '0xAb5801a7D398351b8bE11C439e05C5B3259aec9B',
      anchoredAt: new Date('2026-04-18T10:30:00Z'),
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });