import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { migrate } from './db.js';
import { getBrandingConfig } from './branding.js';
import { authRequired } from './auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import planRoutes from './routes/plans.js';
import bucketRoutes from './routes/buckets.js';
import taskRoutes from './routes/tasks.js';
import notificationRoutes from './routes/notifications.js';
import { startScheduler } from './scheduler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---- Branding (geteiltes Cores-System) ----
// GET /api/v1/branding — liefert Planner-spezifische Branding-Daten
app.get('/api/v1/branding', async (req, res) => {
  try {
    const cfg = await getBrandingConfig();
    res.json(cfg);
  } catch (e) {
    console.error('Branding-Fehler:', e);
    res.json({
      companyName: 'Tsunami Events',
      brandName: 'Planner',
      sidebarLogo: '',
      loginLogo: '',
      faviconPath: '',
      logoSizeSidebar: 100,
      logoSizeLogin: 100,
    });
  }
});

// ---- Planner API Routes ----
// Doppelt gemountet: standalone (/api/*) und hinter cores-dashboard Proxy (/api/v1/planner/*)
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/plans', planRoutes);
apiRouter.use('/buckets', bucketRoutes);
apiRouter.use('/', taskRoutes);
apiRouter.use('/notifications', notificationRoutes);

// /me endpoint — für cores-dashboard Proxy (GET /api/v1/planner/me)
apiRouter.get('/me', authRequired, (req, res) => {
  res.json({
    userId: req.user.userid,
    username: req.user.username,
    email: req.user.email,
    isAdmin: req.user.is_admin,
  });
});

app.use('/api', apiRouter);
app.use('/api/v1/planner', apiRouter);

// Zentrale Fehlerbehandlung
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Datei ist zu groß (max. 25 MB)' });
  res.status(500).json({ error: 'Interner Serverfehler' });
});

// ---- Statische Dateien ----
const publicDir = path.join(__dirname, '..', 'public');

// Branding-Logos aus dem geteilten Volume
const brandingLogosDir = '/var/lib/branding/logos';
if (fs.existsSync(brandingLogosDir)) {
  app.use('/logos', express.static(brandingLogosDir, { maxAge: '1h' }));
}

// Frontend-Assets (theme CSS, JS, Bilder etc.)
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// SPA-Fallback mit __APP_CONFIG__-Injection
app.get(/^\/(?!api\/).*/, async (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('Frontend nicht gefunden');
  }

  try {
    const cfg = await getBrandingConfig();
    let html = fs.readFileSync(indexPath, 'utf-8');

    // __APP_CONFIG__ vor </head> injecten
    const configScript = `<script>window.__APP_CONFIG__={branding:${JSON.stringify(cfg)}};</script>`;
    let appleIcon = '';
    if (cfg.faviconPath) {
      appleIcon = `<link rel="apple-touch-icon" sizes="180x180" href="${escapeHtml(cfg.faviconPath)}">`;
    }

    // Favicon dynamisch setzen
    if (cfg.faviconPath) {
      html = html.replace(
        /<link rel="icon"[^>]*>/,
        `<link rel="icon" href="${escapeHtml(cfg.faviconPath)}" type="image/svg+xml">`
      );
    }

    html = html.replace('</head>', configScript + appleIcon + '</head>');
    res.type('html').send(html);
  } catch (e) {
    console.error('SPA-Fallback-Fehler:', e);
    res.sendFile(indexPath);
  }
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

const port = Number(process.env.PORT || 8080);
migrate()
  .then(() => {
    app.listen(port, () => console.log(`PlannerCore läuft auf Port ${port}`));
    startScheduler();
  })
  .catch((e) => {
    console.error('Start fehlgeschlagen:', e);
    process.exit(1);
  });
