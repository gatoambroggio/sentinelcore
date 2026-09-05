# DAWA Security — Sistema de Vigilancia Local

Sistema de seguridad con detección de intrusos (YOLOv8) y reconocimiento facial (InsightFace), streaming WebRTC (go2rtc), backend Express + Prisma (PostgreSQL) y panel web React. 100% local, sin dependencias cloud.

## Instalación en Ubuntu Server 22.04

```bash
# Copiar el proyecto al server y ejecutar:
sudo bash install.sh
```

El instalador configura automáticamente:
- PostgreSQL (base de datos + usuario con CREATEDB)
- Node.js 20 + PM2
- Backend Express con Prisma (JWT auth)
- Frontend React compilado (Vite)
- Motor de IA Python (YOLOv8 + InsightFace + OpenCV)
- go2rtc (streaming WebRTC de cámaras RTSP)
- Nginx (reverse proxy en puerto 80)

## Acceso

- **Panel web:** `http://<IP-del-servidor>`
- **Usuario:** `admin@dahua.local`
- **Contraseña:** `DahuaAdmin2026`

## Servicios (PM2)

| Servicio | Descripción | Puerto |
|---|---|---|
| dahua-backend | API Express + Prisma | 4000 |
| dahua-ai | Motor IA (Flask + procesamiento) | 5000 |
| go2rtc | Streaming WebRTC | 8083 |

## Estructura

```
dahua-security/
├── install.sh              # Instalador automático
├── backend/                # API Express + Prisma
│   ├── prisma/schema.prisma
│   └── src/
│       ├── server.js
│       ├── seed.js
│       ├── lib/            # prisma, auth, aiClient
│       ├── middleware/     # auth, role
│       └── routes/         # auth, users, cameras, zones, faces, events, stats
├── ai-engine/              # Python (Flask + YOLOv8 + InsightFace)
│   ├── app.py
│   └── requirements.txt
├── frontend/               # React + Vite + Tailwind + Recharts
│   └── src/
│       ├── pages/          # Login, Dashboard, Cameras, Events, FaceId, Users
│       └── components/     # Layout, Sidebar, ProtectedRoute, StatCard
├── go2rtc/                 # Streaming config
└── nginx/                  # Nginx config
```

## Cámaras

Las cámaras deben ser RTSP accesibles desde la LAN. Formato típico Dahua:
```
rtsp://usuario:password@192.168.1.108:554/cam/realmonitor?channel=1&subtype=0
```

Se agregan desde el panel web → Cámaras → Agregar.