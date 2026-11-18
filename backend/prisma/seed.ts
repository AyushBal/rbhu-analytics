import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@rbhu.in';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Demo Admin', role: 'admin', passwordHash: await bcrypt.hash(password, 10) },
  });

  if ((await prisma.customer.count()) > 0) return console.log('Seed: data already present, skipping demo records');

  const customers = await Promise.all(
    [
      ['Asha Mehta', 'asha@orbitfreight.example', 'Orbit Freight'],
      ['Rahul Nair', 'rahul@bluelane.example', 'BlueLane Traders'],
      ['Meera Iyer', 'meera@sahyadri.example', 'Sahyadri Foods'],
      ['Kabir Shah', 'kabir@northwind.example', 'Northwind Retail'],
    ].map(([name, e, company]) => prisma.customer.create({ data: { name, email: e, company, createdBy: 'seed', updatedBy: 'seed' } })),
  );

  const routes: [string, string][] = [['Mumbai', 'Pune'], ['Navi Mumbai', 'Bengaluru'], ['Chennai', 'Hyderabad'], ['Delhi', 'Jaipur'], ['Kolkata', 'Guwahati']];
  const statuses = ['Pending', 'InTransit', 'InTransit', 'OutForDelivery', 'Delivered', 'Delivered', 'Cancelled'] as const;
  for (let i = 0; i < 14; i++) {
    const [origin, destination] = routes[i % routes.length];
    const status = statuses[i % statuses.length];
    await prisma.shipment.create({
      data: {
        trackingNumber: `RBHU-DEMO${String(1000 + i)}`,
        customerId: customers[i % customers.length].id,
        origin, destination, status,
        createdBy: 'seed', updatedBy: 'seed',
        events: { create: { toStatus: status, changedBy: 'seed' } },
      },
    });
  }
  console.log(`Seeded admin ${email} / ${password}, 4 customers, 14 shipments`);
}

main().finally(() => prisma.$disconnect());
