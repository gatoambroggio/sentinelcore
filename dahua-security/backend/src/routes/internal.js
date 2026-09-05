import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// Simple internal key for AI engine communication (localhost/LAN only)
const INTERNAL_KEY = process.env.AI_SERVICE_TOKEN || 'dahua-internal-2026';

router.use((req, res, next) => {
  const key = req.headers['x-internal-key'];
  if (key !== INTERNAL_KEY) {
    return res.status(401).json({ error: 'Internal key required' });
  }
  next();
});

// Active cameras with zones for AI processing
router.get('/cameras', async (req, res) => {
  const cameras = await prisma.camera.findMany({
    where: { active: true },
    include: { zone: true },
  });
  res.json(cameras);
});

// All active faces with embeddings for recognition
router.get('/faces', async (req, res) => {
  const faces = await prisma.face.findMany({
    where: { active: true },
    select: { id: true, name: true, embedding: true },
  });
  res.json(faces);
});

// Create event from AI detection
router.post('/events', async (req, res) => {
  const { cameraId, type, confidence, snapshotPath, bbox, faceName, message } = req.body;
  if (!cameraId || !type) return res.status(400).json({ error: 'cameraId and type required' });
  try {
    const event = await prisma.event.create({
      data: { cameraId, type, confidence: confidence || 0, snapshotPath, bbox, faceName, message },
    });
    res.status(201).json(event);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;