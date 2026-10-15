import { EquipmentStatus, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'password123';

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const users = [
    { name: 'Admin User', email: 'admin@example.com', role: Role.ADMIN },
    { name: 'Somchai Jaidee', email: 'employee@example.com', role: Role.EMPLOYEE },
    { name: 'Somsri Rakngan', email: 'employee2@example.com', role: Role.EMPLOYEE },
  ];

  // upsert keeps the seed idempotent: running it twice won't duplicate users.
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash },
    });
  }

  // Equipment has no natural unique key, so only seed into an empty table.
  if ((await prisma.equipment.count()) === 0) {
    await prisma.equipment.createMany({
      data: [
        { name: 'Dell 24" Monitor', category: 'Monitor', stockQuantity: 10 },
        { name: 'LG 27" 4K Monitor', category: 'Monitor', stockQuantity: 3 },
        { name: 'Logitech K380 Keyboard', category: 'Keyboard', stockQuantity: 15 },
        { name: 'Logitech MX Master 3S', category: 'Mouse', stockQuantity: 8 },
        // Edge cases: out of stock, and inactive — employees can't request these.
        { name: 'USB-C Hub', category: 'Accessory', stockQuantity: 0 },
        {
          name: 'VGA Adapter',
          category: 'Accessory',
          stockQuantity: 5,
          status: EquipmentStatus.INACTIVE,
        },
      ],
    });
  }

  console.log(`Seed completed. Default password for all users: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
