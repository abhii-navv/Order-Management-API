require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const createTables = require('./src/config/createTables');
const seedData = require('./src/config/seedData');

const authRoutes = require('./src/routes/authRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const requestLogger = require('./src/middleware/requestLogger');

const app = express();

// ── Request Tracing ────────────────────────────────────────────────────────────
// Attach a unique request ID to every response for distributed tracing / log correlation
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});

// ── Security Middleware ────────────────────────────────────────────────────────
// Set secure HTTP headers to prevent common web vulnerabilities (XSS, clickjacking, etc.)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; object-src 'none';"
  );
  next();
});

// ── CORS – restrict to known origins ──────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin) or whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin "${origin}" not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── In-memory rate limiter (no external dep) ──────────────────────────────────
// Limits each IP to MAX_REQUESTS per WINDOW_MS to guard against brute-force / DoS
const WINDOW_MS = parseInt(process.env.RATE_WINDOW_MS || '60000', 10); // 1 min
const MAX_REQUESTS = parseInt(process.env.RATE_MAX_REQUESTS || '100', 10);
const ipHits = new Map();

setInterval(() => ipHits.clear(), WINDOW_MS); // flush window every interval

app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const count = (ipHits.get(ip) || 0) + 1;
  ipHits.set(ip, count);
  if (count > MAX_REQUESTS) {
    return res.status(429).json({
      message: 'Too many requests — please wait before retrying.',
      retryAfter: `${Math.ceil(WINDOW_MS / 1000)}s`,
    });
  }
  next();
});

// ── Body Parsing ───────────────────────────────────────────────────────────────
// Limit JSON body size to guard against payload-flooding attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── Request Logger ─────────────────────────────────────────────────────────────
// Structured logger: coloured dev output, JSON in production (response-time aware)
app.use(requestLogger);

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reports', reportRoutes);

// ── Health Check ───────────────────────────────────────────────────────────────
// Probes DB connectivity so load-balancers / readiness probes get real signal.
const pool = require('./src/config/db');

app.get('/api/v1/health', async (req, res) => {
  const start = Date.now();
  let dbStatus = 'ok';
  let dbLatencyMs = null;
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    dbLatencyMs = Date.now() - start;
    client.release();
  } catch {
    dbStatus = 'error';
  }

  const mem = process.memoryUsage();
  const status = dbStatus === 'ok' ? 200 : 503;

  res.status(status).json({
    status:      dbStatus === 'ok' ? 'healthy' : 'degraded',
    version:     process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime:      Math.round(process.uptime()),
    database: {
      status:    dbStatus,
      latencyMs: dbLatencyMs,
    },
    memory: {
      heapUsedMB:  (mem.heapUsed  / 1024 / 1024).toFixed(2),
      heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
      rssMB:       (mem.rss       / 1024 / 1024).toFixed(2),
    },
  });
});

// Keep a minimal root alias for browsers
app.get('/', (req, res) => {
  res.json({
    message: '📦 Inventory & Order Management API is running',
    health:  '/api/v1/health',
  });
});

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';
  console.error(`[ERROR ${status}]`, err.message);
  if (isDev) console.error(err.stack);
  res.status(status).json({
    error: err.name || 'Error',
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

// ── Bootstrap ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
  await createTables();
  await seedData();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🛡️  CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`⚡  Rate limit: ${MAX_REQUESTS} req / ${WINDOW_MS / 1000}s per IP`);
  });
};

start();
