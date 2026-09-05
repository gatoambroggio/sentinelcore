import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const zones = await prisma.zone.findMany({
    include: { cameras: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(zones);
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const { name, polygon, active } = req.body;
  if (!name || !Array.isArray(polygon) || polygon.length < 3) {
    return res.status(400).json({ error: 'Nombre y polígono (mínimo 3 puntos) requeridos' });
  }
  const zone = await prisma.zone.create({
    data: { name, polygon, active: active !== false },
    include: { cameras: { select: { id: true, name: true } } },
  });
  res.status(201).json(zone);
});

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, polygon, active } = req.body;
  const data = {};
  if (name) data.name = name;
  if (Array.isArray(polygon)) data.polygon = polygon;
  if (active !== undefined) data.active = active;
  const zone = await prisma.zone.update({
    where: { id },
    data,
    include: { cameras: { select: { id: true, name: true } } },
  });
  res.json(zone);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  await prisma.zone.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;