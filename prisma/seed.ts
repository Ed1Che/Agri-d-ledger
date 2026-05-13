// prisma/seed.ts — development seed data

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Cooperative
  const coop = await prisma.cooperative.upsert({
    where:  { id: 'coop-001-seed-uuid-0000-000000000000' },
    update: {},
    create: {
      id:     'coop-001-seed-uuid-0000-000000000000',
      name:   'Kiambu Coffee Growers Cooperative',
      county: 'Kiambu',
    },
  });

  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // Seed users
  const users = [
    { phone: '+254700000001', password: 'Farmer@2024', role: Role.FARMER,      nationalId: 'KE12345678', cooperativeId: coop.id },
    { phone: '+254700000002', password: 'Buyer@2024',  role: Role.BUYER,       nationalId: null,         cooperativeId: null },
    { phone: '+254700000003', password: 'Admin@2024',  role: Role.COOP_ADMIN,  nationalId: null,         cooperativeId: coop.id },
    { phone: '+254700000004', password: 'Kebs@2024',   role: Role.REGULATOR,   nationalId: null,         cooperativeId: null },
    { phone: '+254700000005', password: 'Super@2024',  role: Role.SUPER_ADMIN, nationalId: null,         cooperativeId: null },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where:  { phone: u.phone },
      update: {},
      create: {
        phone:          u.phone,
        passwordHash:   await hash(u.password),
        role:           u.role,
        cooperativeId:  u.cooperativeId,
        nationalIdHash: u.nationalId
          ? createHash('sha256').update(u.nationalId).digest('hex')
          : null,
      },
    });
  }

  console.log('Seed complete ✓');
}

main().catch(console.error).finally(() => prisma.$disconnect());
