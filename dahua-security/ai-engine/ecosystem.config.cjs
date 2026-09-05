module.exports = {
  apps: [{
    name: 'dahua-ai',
    script: '.venv/bin/python',
    args: 'app.py',
    cwd: '/opt/dahua-enterprise/ai-engine',
    interpreter: 'none',
    env: {
      AI_SERVICE_TOKEN: 'dahua-internal-2026',
      API_BASE: 'http://localhost:4000',
      SNAPSHOTS_DIR: '/opt/dahua-enterprise/snapshots',
    },
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
  }],
};