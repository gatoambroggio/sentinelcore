module.exports = {
  apps: [{
    name: 'dahua-backend',
    script: 'src/server.js',
    cwd: '/opt/dahua-enterprise/backend',
    env: {
      NODE_ENV: 'production',
      AI_SERVICE_TOKEN: 'dahua-internal-2026',
    },
    instances: 1,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
  }],
};