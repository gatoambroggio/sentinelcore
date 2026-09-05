#!/usr/bin/env bash
set -euo pipefail

# ============================================================
#  DAWA Security — Sistema de Vigilancia Local
#  Installer for Ubuntu Server 22.04 (LAN-only)
# ============================================================

INSTALL_DIR="${INSTALL_DIR:-/opt/dahua-enterprise}"
DB_NAME="dahua"
DB_USER="dahua"
DB_PASS="dahua_secure_2026"
JWT_SECRET=$(openssl rand -hex 32)
AI_PORT=5000
API_PORT=4000
GO2RTC_PORT=8083
ADMIN_EMAIL="admin@dahua.local"
ADMIN_PASS="DahuaAdmin2026"
SERVER_IP=$(hostname -I | awk '{print $1}')

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

if [[ $EUID -ne 0 ]]; then err "Ejecutar como root (sudo bash install.sh)"; exit 1; fi

echo -e "${CYAN}"
echo "============================================================"
echo "  DAWA Security — Sistema de Vigilancia Local"
echo "  Instalador para Ubuntu Server 22.04"
echo "============================================================"
echo -e "${NC}"

# ── 1. System packages ──────────────────────────────────────
log "Actualizando repositorios..."
apt-get update -qq

log "Instalando dependencias del sistema..."
apt-get install -y -qq \
  curl wget git build-essential rsync \
  nginx ffmpeg \
  postgresql postgresql-contrib \
  python3 python3-venv python3-dev \
  libgl1 libglib2.0-0 libsm6 libxext6 libxrender-dev \
  ca-certificates gnupg > /dev/null 2>&1

# ── 2. Node.js 20 ───────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  log "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs > /dev/null 2>&1
fi
log "Node.js: $(node -v)"

# ── 3. PM2 ──────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  log "Instalando PM2..."
  npm install -g pm2 > /dev/null 2>&1
fi

# ── 4. PostgreSQL ───────────────────────────────────────────
log "Configurando PostgreSQL..."
systemctl enable --now postgresql > /dev/null 2>&1

for i in $(seq 1 15); do
  sudo -u postgres psql -c "SELECT 1" &>/dev/null && break
  sleep 1
done

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH CREATEDB PASSWORD '${DB_PASS}';" > /dev/null 2>&1
  log "Usuario PostgreSQL '${DB_USER}' creado (con CREATEDB)"
else
  sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH CREATEDB PASSWORD '${DB_PASS}';" > /dev/null 2>&1
  warn "Usuario '${DB_USER}' ya existía — contraseña actualizada"
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
  log "Base de datos '${DB_NAME}' creada"
else
  warn "Base de datos '${DB_NAME}' ya existía"
fi

# ── 5. Project directory ────────────────────────────────────
log "Configurando proyecto en ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}/snapshots"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "${SCRIPT_DIR}" != "${INSTALL_DIR}" ]]; then
  log "Copiando archivos del proyecto..."
  rsync -a --exclude node_modules --exclude .venv --exclude __pycache__ \
    --exclude dist --exclude .git \
    "${SCRIPT_DIR}/" "${INSTALL_DIR}/"
fi
cd "${INSTALL_DIR}"

# ── 6. .env ─────────────────────────────────────────────────
log "Generando backend/.env..."
cat > "${INSTALL_DIR}/backend/.env" <<EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?schema=public"
JWT_SECRET="${JWT_SECRET}"
AI_ENGINE_URL="http://localhost:${AI_PORT}"
PORT=${API_PORT}
ADMIN_EMAIL="${ADMIN_EMAIL}"
ADMIN_PASSWORD="${ADMIN_PASS}"
SNAPSHOTS_DIR="${INSTALL_DIR}/snapshots"
AI_SERVICE_TOKEN="dahua-internal-2026"
EOF

# ── 7. Backend ───────────────────────────────────────────────
log "Instalando dependencias del backend..."
cd "${INSTALL_DIR}/backend"
npm install --silent > /dev/null 2>&1

log "Generando Prisma y sincronizando base de datos..."
npx prisma generate > /dev/null 2>&1
npx prisma db push --accept-data-loss > /dev/null 2>&1

log "Creando usuario administrador..."
node src/seed.js 2>/dev/null || warn "Usuario admin ya existía"

# ── 8. Frontend ─────────────────────────────────────────────
log "Instalando y compilando frontend..."
cd "${INSTALL_DIR}/frontend"
npm install --silent > /dev/null 2>&1
VITE_API_URL="/api" npx vite build > /dev/null 2>&1
log "Frontend compilado en dist/"

# ── 9. AI Engine ─────────────────────────────────────────────
log "Configurando motor de IA (YOLOv8 + InsightFace)..."
cd "${INSTALL_DIR}/ai-engine"
[[ -d ".venv" ]] || python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
deactivate
log "Motor de IA listo"

# ── 10. go2rtc ───────────────────────────────────────────────
log "Configurando go2rtc..."
GO2RTC_DIR="${INSTALL_DIR}/go2rtc"
mkdir -p "${GO2RTC_DIR}"
if [[ ! -f "${GO2RTC_DIR}/go2rtc" ]]; then
  GO2RTC_ARCH="amd64"
  [[ "$(uname -m)" == "aarch64" ]] && GO2RTC_ARCH="arm64"
  curl -L "https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_linux_${GO2RTC_ARCH}" \
    -o "${GO2RTC_DIR}/go2rtc" > /dev/null 2>&1
  chmod +x "${GO2RTC_DIR}/go2rtc"
fi
log "go2rtc instalado"

# ── 11. Nginx ────────────────────────────────────────────────
log "Configurando Nginx..."
cat > /etc/nginx/sites-available/dahua-security <<'EOF_NGINX'
server {
    listen 80;
    server_name _;
    client_max_body_size 50M;
    root /opt/dahua-enterprise/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location /stream/ {
        proxy_pass http://localhost:8083/;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    location /snapshots/ {
        alias /opt/dahua-enterprise/snapshots/;
    }
}
EOF_NGINX
ln -sf /etc/nginx/sites-available/dahua-security /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1 && systemctl reload nginx
log "Nginx configurado"

# ── 12. PM2 ──────────────────────────────────────────────────
log "Registrando servicios en PM2..."
cd "${INSTALL_DIR}"
pm2 delete dahua-backend 2>/dev/null || true
pm2 delete dahua-ai 2>/dev/null || true
pm2 delete go2rtc 2>/dev/null || true

pm2 start backend/ecosystem.config.cjs
pm2 start ai-engine/ecosystem.config.cjs
pm2 start "${GO2RTC_DIR}/go2rtc" --name go2rtc -- config "${GO2RTC_DIR}/go2rtc.yaml"

pm2 save > /dev/null 2>&1
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
log "Servicios arrancados"

# ── 13. Permissions ─────────────────────────────────────────
chown -R www-data:www-data "${INSTALL_DIR}/snapshots" 2>/dev/null || true
chmod -R 755 "${INSTALL_DIR}/snapshots" 2>/dev/null || true

# ── Summary ─────────────────────────────────────────────────
echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${GREEN}  ✓ INSTALACIÓN COMPLETADA${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""
echo -e "  ${CYAN}Panel web:${NC}     http://${SERVER_IP}"
echo -e "  ${CYAN}Usuario:${NC}       ${ADMIN_EMAIL}"
echo -e "  ${CYAN}Contraseña:${NC}    ${ADMIN_PASS}"
echo ""
echo -e "  ${YELLOW}Servicios PM2:${NC}"
echo -e "    • dahua-backend  — API Express (puerto ${API_PORT})"
echo -e "    • dahua-ai        — Motor IA YOLOv8+InsightFace (puerto ${AI_PORT})"
echo -e "    • go2rtc          — Streaming WebRTC (puerto ${GO2RTC_PORT})"
echo ""
echo -e "  ${YELLOW}Comandos:${NC}"
echo -e "    pm2 status              — estado de servicios"
echo -e "    pm2 logs dahua-backend  — logs del backend"
echo -e "    pm2 logs dahua-ai       — logs de IA"
echo ""
echo -e "${CYAN}============================================================${NC}"