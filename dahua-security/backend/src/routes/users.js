import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const { email, password, fullName, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: 'Ya existe un usuario con ese email' });

  const user = await prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      fullName: fullName || null,
      role: role || 'OPERATOR',
    },
    select: { id: true, email: true, fullName: true, role: true, active: true },
  });
  res.status(201).json(user);
});

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { email, password, fullName, role } = req.body;
  const data = {};
  if (email) data.email = email;
  if (fullName !== undefined) data.fullName = fullName;
  if (role) data.role = role;
  if (password) data.password = await hashPassword(password);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, fullName: true, role: true, active: true },
  });
  res.json(user);
});

router.patch('/:id/active', requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  // Prevent deactivating the last admin
  if (active === false) {
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
      if (adminCount <= 1) return res.status(400).json({ error: 'No se puede desactivar el último administrador' });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { active },
    select: { id: true, email: true, active: true },
  });
  res.json(user);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (target.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
    if (adminCount <= 1) return res.status(400).json({ error: 'No se puede eliminar el último administrador' });
  }

  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;