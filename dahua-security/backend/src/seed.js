import 'dotenv/config';
import prisma from './lib/prisma.js';
import { hashPassword } from './lib/auth.js';

async function seed() {
  const email = process.env.ADMIN_EMAIL || 'admin@dahua.local';
  const password = process.env.ADMIN_PASSWORD || 'DahuaAdmin2026';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] Usuario admin '${email}' ya existe — omitiendo`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      fullName: 'Administrador',
      role: 'ADMIN',
    },
  });
  console.log(`[seed] Usuario admin creado: ${user.email} (id: ${user.id})`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());