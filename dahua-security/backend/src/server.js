import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import prisma from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import cameraRoutes from './routes/cameras.js';
import zoneRoutes from './routes/zones.js';
import faceRoutes from './routes/faces.js';
import eventRoutes from './routes/events.js';
import statsRoutes from './routes/stats.js';
import internalRoutes from './routes/internal.js';

const app = express();
const PORT = process.env.PORT || 4000;
const SNAPSHOTS_DIR = process.env.SNAPSHOTS_DIR || '/opt/dahua-enterprise/snapshots';

// Ensure snapshots directory exists
fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
fs.mkdirSync(path.join(SNAPSHOTS_DIR, 'faces'), { recursive: true });

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Static snapshots
app.use('/snapshots', express.static(SNAPSHOTS_DIR));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/faces', faceRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/internal', internalRoutes);

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`[DAWA Backend] corriendo en puerto ${PORT}`);
  // Sync camera streams to go2rtc on startup
  try {
    const cameras = await prisma.camera.findMany({ where: { active: true } });
    for (const cam of cameras) {
      await fetch(`http://localhost:8083/api/streams?name=${cam.id}&src=${encodeURIComponent(cam.rtspUrl)}`, {
        method: 'PUT',
        signal: AbortSignal.timeout(3000),
      }).catch(() => {});
    }
    console.log(`[DAWA Backend] ${cameras.length} streams sincronizados en go2rtc`);
  } catch (e) {
    console.log('[DAWA Backend] go2rtc no disponible aún — streams se sincronizarán luego');
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});