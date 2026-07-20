/**
 * requestLogger.js
 *
 * Structured HTTP request logger middleware.
 * Logs method, URL, status code, response time (ms), and request ID on each
 * response. Output is machine-readable JSON in production and coloured text
 * in development for easy console scanning.
 *
 * Usage:
 *   const requestLogger = require('./middleware/requestLogger');
 *   app.use(requestLogger);
 */

const COLORS = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  grey:   '\x1b[90m',
};

/**
 * Pick a terminal colour based on HTTP status code.
 * 2xx → green, 3xx → cyan, 4xx → yellow, 5xx → red.
 */
const statusColor = (status) => {
  if (status >= 500) return COLORS.red;
  if (status >= 400) return COLORS.yellow;
  if (status >= 300) return COLORS.cyan;
  return COLORS.green;
};

const isProd = process.env.NODE_ENV === 'production';

/**
 * Express middleware that:
 * 1. Records the request start time.
 * 2. Hooks into res.finish to capture the final status and elapsed time.
 * 3. Emits a structured log line (JSON in prod, coloured text in dev).
 */
const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const status = res.statusCode;
    const requestId = req.requestId || '-';

    if (isProd) {
      // Machine-readable JSON for log aggregation (CloudWatch, Datadog, etc.)
      console.log(JSON.stringify({
        ts:        new Date().toISOString(),
        method:    req.method,
        url:       req.originalUrl,
        status,
        ms:        durationMs.toFixed(2),
        requestId,
        ip:        req.ip || req.socket?.remoteAddress,
      }));
    } else {
      const color = statusColor(status);
      const ts    = new Date().toISOString();
      console.log(
        `${COLORS.grey}[${ts}]${COLORS.reset} ` +
        `${COLORS.cyan}${req.method.padEnd(7)}${COLORS.reset} ` +
        `${req.originalUrl.padEnd(45)} ` +
        `${color}${status}${COLORS.reset} ` +
        `${COLORS.grey}${durationMs.toFixed(2)}ms  id:${requestId}${COLORS.reset}`
      );
    }
  });

  next();
};

module.exports = requestLogger;
