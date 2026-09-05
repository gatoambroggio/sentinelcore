import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { getFaceEmbedding, reloadFaces } from '../lib/aiClient.js';

const router = Router();
const SNAPSHOTS_DIR = process.env.SNAPSHOTS_DIR || '/opt/dahua-enterprise/snapshots';

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(SNAPSHOTS_DIR, 'faces');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `face_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(requireAuth);

router.get('/', async (req, res) => {
  const faces = await prisma.face.findMany({
    select: { id: true, name: true, photoUrl: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(faces);
});

router.post('/', requireRole('ADMIN'), upload.single('photo'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  if (!req.file) return res.status(400).json({ error: 'Foto requerida' });

  const photoUrl = `/snapshots/faces/${req.file.filename}`;

  try {
    const result = await getFaceEmbedding(`http://localhost:4000${photoUrl}`);
    if (!result.embedding || result.embedding.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(422).json({ error: 'No se detectó un rostro en la imagen' });
    }

    const face = await prisma.face.create({
      data: {
        name,
        embedding: result.embedding,
        photoUrl,
      },
      select: { id: true, name: true, photoUrl: true, active: true },
    });

    await reloadFaces();
    res.status(201).json(face);
  } catch (e) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(502).json({ error: `Error del motor de IA: ${e.message}` });
  }
});

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, active } = req.body;
  const data = {};
  if (name) data.name = name;
  if (active !== undefined) data.active = active;
  const face = await prisma.face.update({ where: { id }, data, select: { id: true, name: true, photoUrl: true, active: true } });
  await reloadFaces();
  res.json(face);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const face = await prisma.face.findUnique({ where: { id } });
  if (face?.photoUrl) {
    const filePath = path.join(SNAPSHOTS_DIR, face.photoUrl.replace('/snapshots/', ''));
    fs.unlink(filePath, () => {});
  }
  await prisma.face.delete({ where: { id } });
  await reloadFaces();
  res.json({ ok: true });
});

export default router;