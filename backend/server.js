require('dotenv').config();
const express = require('express');
const cors = require('cors');
const createTables = require('./src/config/createTables');

const authRoutes      = require('./src/routes/authRoutes');
const categoryRoutes  = require('./src/routes/categoryRoutes');
const productRoutes   = require('./src/routes/productRoutes');
const orderRoutes     = require('./src/routes/orderRoutes');
const reportRoutes    = require('./src/routes/reportRoutes');

const app = express();

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
const WINDOW_MS    = parseInt(process.env.RATE_WINDOW_MS  || '60000', 10); // 1 min
const MAX_REQUESTS = parseInt(process.env.RATE_MAX_REQUESTS || '100',  10);
const ipHits       = new Map();

setInterval(() => ipHits.clear(), WINDOW_MS); // flush window every interval

app.use((req, res, next) => {
  const ip    = req.ip || req.socket.remoteAddress || 'unknown';
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

// ── Request Logger (dev) ───────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',       authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products',   productRoutes);
app.use('/api/v1/orders',     orderRoutes);
app.use('/api/v1/reports',    reportRoutes);

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '📦 Inventory & Order Management API is running',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
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
  const isDev  = process.env.NODE_ENV !== 'production';
  console.error(`[ERROR ${status}]`, err.message);
  if (isDev) console.error(err.stack);
  res.status(status).json({
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

// ── Bootstrap ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
  await createTables();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🛡️  CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`⚡  Rate limit: ${MAX_REQUESTS} req / ${WINDOW_MS / 1000}s per IP`);
  });
};

start();
