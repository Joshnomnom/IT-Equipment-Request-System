import { EquipmentStatus, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'password123';

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const users = [
    { name: 'Admin User', email: 'admin@example.com', role: Role.ADMIN },
    {
      name: 'Somchai Jaidee',
      email: 'employee@example.com',
      role: Role.EMPLOYEE,
    },
    {
      name: 'Somsri Rakngan',
      email: 'employee2@example.com',
      role: Role.EMPLOYEE,
    },
    { name: 'Anan Wongsa', email: 'anan@example.com', role: Role.EMPLOYEE },
    {
      name: 'Pimchanok Chaiyo',
      email: 'pimchanok@example.com',
      role: Role.EMPLOYEE,
    },
    { name: 'Krit Sukjai', email: 'krit@example.com', role: Role.EMPLOYEE },
    { name: 'Nida Thongdee', email: 'nida@example.com', role: Role.EMPLOYEE },
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
        {
          name: 'Logitech K380 Keyboard',
          category: 'Keyboard',
          stockQuantity: 15,
        },
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

  await seedSampleRequests();

  console.log(
    `Seed completed. Default password for all users: ${DEFAULT_PASSWORD}`,
  );
}

/**
 * Sample PENDING requests so the admin list has enough rows to filter and
 * paginate. Only PENDING: an APPROVED sample would need stock already
 * deducted and audit logs written, which only the real approve flow does.
 * Each (employee, equipment) pair appears once — the one-pending-request rule.
 */
async function seedSampleRequests() {
  if ((await prisma.requisition.count()) > 0) return;

  const samples: [
    email: string,
    equipment: string,
    quantity: number,
    reason: string,
  ][] = [
    [
      'employee@example.com',
      'Logitech K380 Keyboard',
      1,
      'Current keyboard has several unresponsive keys',
    ],
    [
      'employee2@example.com',
      'Dell 24" Monitor',
      2,
      'Dual-monitor setup for financial reporting',
    ],
    [
      'employee2@example.com',
      'Logitech MX Master 3S',
      1,
      'Ergonomic mouse recommended after wrist strain',
    ],
    ['anan@example.com', 'Dell 24" Monitor', 1, 'New hire starting on Monday'],
    [
      'anan@example.com',
      'Logitech K380 Keyboard',
      1,
      'New hire starting on Monday',
    ],
    [
      'anan@example.com',
      'Logitech MX Master 3S',
      1,
      'New hire starting on Monday',
    ],
    [
      'pimchanok@example.com',
      'LG 27" 4K Monitor',
      1,
      'Colour-accurate display needed for design work',
    ],
    [
      'pimchanok@example.com',
      'Logitech K380 Keyboard',
      2,
      'Replacement keyboards for the meeting room',
    ],
    [
      'krit@example.com',
      'Dell 24" Monitor',
      3,
      'Setting up the new training room',
    ],
    [
      'krit@example.com',
      'LG 27" 4K Monitor',
      2,
      'Video editing for the marketing campaign',
    ],
    [
      'krit@example.com',
      'Logitech MX Master 3S',
      2,
      'Training room workstations',
    ],
    [
      'nida@example.com',
      'Dell 24" Monitor',
      1,
      'Monitor flickering, IT ticket #4521',
    ],
    [
      'nida@example.com',
      'Logitech K380 Keyboard',
      1,
      'Spilled coffee on current keyboard',
    ],
    [
      'nida@example.com',
      'LG 27" 4K Monitor',
      1,
      'Second screen for data analysis',
    ],
    [
      'employee2@example.com',
      'Logitech K380 Keyboard',
      1,
      'Keyboard for working from home',
    ],
    [
      'pimchanok@example.com',
      'Logitech MX Master 3S',
      1,
      'Scroll wheel on current mouse is broken',
    ],
  ];

  const users = await prisma.user.findMany();
  const equipment = await prisma.equipment.findMany();
  const userId = (email: string) => users.find((u) => u.email === email)!.id;
  const equipmentId = (name: string) =>
    equipment.find((e) => e.name === name)!.id;

  // Spread submissions over the past few days (oldest first) so ordering is visible.
  const hour = 60 * 60 * 1000;
  const now = Date.now();
  await prisma.requisition.createMany({
    data: samples.map(([email, name, quantity, reason], i) => ({
      userId: userId(email),
      equipmentId: equipmentId(name),
      quantity,
      reason,
      createdAt: new Date(now - (samples.length - i) * 5 * hour),
    })),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
