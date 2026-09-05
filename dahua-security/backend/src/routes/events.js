import { Router } from 'express';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

function buildWhere(query) {
  const { type, cameraId, from, to, minConfidence } = query;
  const where = {};
  if (type) where.type = type;
  if (cameraId) where.cameraId = cameraId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (minConfidence) where.confidence = { gte: parseFloat(minConfidence) };
  return where;
}

// List with filters + pagination
router.get('/', async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const where = buildWhere(req.query);
  const take = Math.min(parseInt(limit), 500);
  const skip = (parseInt(page) - 1) * take;

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { camera: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.event.count({ where }),
  ]);

  res.json({ events, total, page: parseInt(page), pages: Math.ceil(total / take) });
});

// Export CSV
router.get('/export/csv', async (req, res) => {
  const where = buildWhere(req.query);
  const events = await prisma.event.findMany({
    where,
    include: { camera: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const fields = ['createdAt', 'type', 'camera', 'faceName', 'confidence', 'message'];
  const data = events.map(e => ({
    createdAt: e.createdAt.toISOString(),
    type: e.type,
    camera: e.camera?.name || '',
    faceName: e.faceName || '',
    confidence: e.confidence.toFixed(2),
    message: e.message || '',
  }));

  const csv = new Parser({ fields }).parse(data);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=eventos.csv');
  res.send(csv);
});

// Export PDF
router.get('/export/pdf', async (req, res) => {
  const where = buildWhere(req.query);
  const events = await prisma.event.findMany({
    where,
    include: { camera: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=eventos.pdf');

  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  doc.pipe(res);
  doc.fontSize(18).text('DAWA Security — Reporte de Eventos', { align: 'center' });
  doc.moveDown();
  doc.fontSize(9).fillColor('#666').text(`Generado: ${new Date().toLocaleString('es-AR')} — Total: ${events.length} eventos`);
  doc.moveDown();

  events.forEach((e, i) => {
    if (doc.y > 750) doc.addPage();
    doc.fillColor('#000').fontSize(9)
      .text(`${i + 1}. [${e.createdAt.toISOString()}] ${e.type}`, { continued: true })
      .fillColor('#444').text(`  | Cam: ${e.camera?.name || '-'}  | Confianza: ${e.confidence.toFixed(2)}`);
    if (e.faceName) doc.fillColor('#0066cc').text(`     Rostro: ${e.faceName}`);
    if (e.message) doc.fillColor('#666').text(`     ${e.message}`);
    doc.moveDown(0.3);
  });

  doc.end();
});

// Single event
router.get('/:id', async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: { camera: { select: { id: true, name: true } } },
  });
  if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
  res.json(event);
});

export default router;