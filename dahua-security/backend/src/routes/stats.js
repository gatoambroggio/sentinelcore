import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalEvents,
    events24h,
    intrusionCount,
    faceIdCount,
    unknownFaceCount,
    totalCameras,
    activeCameras,
    totalFaces,
    eventsByType,
    lastIntrusion,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { createdAt: { gte: last24h } } }),
    prisma.event.count({ where: { type: 'INTRUSION' } }),
    prisma.event.count({ where: { type: 'FACE_ID' } }),
    prisma.event.count({ where: { type: 'UNKNOWN_FACE' } }),
    prisma.camera.count(),
    prisma.camera.count({ where: { active: true } }),
    prisma.face.count({ where: { active: true } }),
    prisma.event.groupBy({ by: ['type'], _count: true }),
    prisma.event.findFirst({
      where: { type: { in: ['INTRUSION', 'UNKNOWN_FACE'] } },
      include: { camera: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Events by hour (last 24h)
  const hourlyRaw = await prisma.event.findMany({
    where: { createdAt: { gte: last24h } },
    select: { createdAt: true, type: true },
  });
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const hourStart = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
    hourStart.setMinutes(0, 0, 0);
    const h = hourStart.getHours();
    const count = hourlyRaw.filter(e => {
      const eh = new Date(e.createdAt);
      return eh.getHours() === h && eh.toDateString() === hourStart.toDateString();
    }).length;
    return { hour: `${String(h).padStart(2, '0')}:00`, count };
  });

  // Events by camera (last 24h)
  const byCameraRaw = await prisma.event.findMany({
    where: { createdAt: { gte: last24h } },
    select: { camera: { select: { name: true } } },
  });
  const camMap = {};
  byCameraRaw.forEach(e => {
    const n = e.camera?.name || 'Sin cámara';
    camMap[n] = (camMap[n] || 0) + 1;
  });
  const byCamera = Object.entries(camMap).map(([name, count]) => ({ name, count }));

  res.json({
    totals: {
      events: totalEvents,
      events24h,
      intrusions: intrusionCount,
      faceIds: faceIdCount,
      unknownFaces: unknownFaceCount,
      cameras: totalCameras,
      activeCameras,
      faces: totalFaces,
    },
    eventsByType: eventsByType.map(t => ({ type: t.type, count: t._count })),
    hourly,
    byCamera,
    lastIntrusion: lastIntrusion ? {
      id: lastIntrusion.id,
      type: lastIntrusion.type,
      camera: lastIntrusion.camera?.name,
      confidence: lastIntrusion.confidence,
      snapshotPath: lastIntrusion.snapshotPath,
      createdAt: lastIntrusion.createdAt,
    } : null,
  });
});

export default router;