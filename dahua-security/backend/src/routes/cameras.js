import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = Router();
const GO2RTC_API = 'http://localhost:8083/api';

async function registerGo2rtcStream(camera) {
  try {
    await fetch(`${GO2RTC_API}/streams?name=${camera.id}&src=${encodeURIComponent(camera.rtspUrl)}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {
    console.error('[go2rtc] Error registering stream:', e.message);
  }
}

async function removeGo2rtcStream(cameraId) {
  try {
    await fetch(`${GO2RTC_API}/streams?name=${cameraId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {
    console.error('[go2rtc] Error removing stream:', e.message);
  }
}

router.use(requireAuth);

function buildRtspUrl({ ip, port, username, password, channel, subtype }) {
  const st = subtype === 'sub' ? 1 : 0;
  return `rtsp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${ip}:${port}/cam/realmonitor?channel=${channel}&subtype=${st}`;
}

router.get('/', async (req, res) => {
  const cameras = await prisma.camera.findMany({
    include: { zone: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(cameras);
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const { name, ip, port, username, password, channel, subtype, zoneId } = req.body;
  if (!name || !ip || !username || !password) {
    return res.status(400).json({ error: 'Nombre, IP, usuario y contraseña son requeridos' });
  }
  const rtspUrl = buildRtspUrl({ ip, port: port || 554, username, password, channel: channel || 1, subtype: subtype || 'main' });

  const camera = await prisma.camera.create({
    data: {
      name,
      ip,
      port: port || 554,
      username,
      password,
      channel: channel || 1,
      subtype: subtype || 'main',
      rtspUrl,
      zoneId: zoneId || null,
    },
    include: { zone: true },
  });
  await registerGo2rtcStream(camera);
  res.status(201).json(camera);
});

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, ip, port, username, password, channel, subtype, zoneId, active } = req.body;
  const data = {};
  if (name) data.name = name;
  if (ip) data.ip = ip;
  if (port) data.port = port;
  if (username) data.username = username;
  if (password) data.password = password;
  if (channel) data.channel = channel;
  if (subtype) data.subtype = subtype;
  if (zoneId !== undefined) data.zoneId = zoneId || null;
  if (active !== undefined) data.active = active;

  // Rebuild RTSP URL if connection params changed
  if (ip || port || username || password || channel || subtype) {
    const current = await prisma.camera.findUnique({ where: { id } });
    data.rtspUrl = buildRtspUrl({
      ip: ip || current.ip,
      port: port || current.port,
      username: username || current.username,
      password: password || current.password,
      channel: channel || current.channel,
      subtype: subtype || current.subtype,
    });
  }

  const camera = await prisma.camera.update({
    where: { id },
    data,
    include: { zone: true },
  });
  await registerGo2rtcStream(camera);
  res.json(camera);
});

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  const { id } = req.params;
  await prisma.camera.delete({ where: { id } });
  await removeGo2rtcStream(id);
  res.json({ ok: true });
});

// Sync all active cameras to go2rtc (call after system restart)
router.post('/sync-streams', requireRole('ADMIN'), async (req, res) => {
  const cameras = await prisma.camera.findMany({ where: { active: true } });
  await Promise.all(cameras.map(c => registerGo2rtcStream(c)));
  res.json({ synced: cameras.length });
});

export default router;