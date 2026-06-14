import 'server-only';
import { redact } from './redact';

// Central structured logger for the Admin dashboard (workflow §4.5).
// - Console always; ships to the SAME Grafana Loki dataset as the backend via
//   Loki's HTTP push API (fetch-based — avoids winston bundling issues under
//   Next 16 / Turbopack while staying sink-agnostic).
// - Secrets / PII redacted before anything leaves the process (lib/redact.js).
// - Backward compatible with the previous console wrapper:
//     logger.info(msg, meta)
//     logger.warn(msg, meta)
//     logger.error(msg, errorOrMeta, meta)
//     logger.debug(msg, meta)
//   Plus logger.withRequest(req, extra) for per-request correlation.

const SERVICE = 'admin';
const ENV = process.env.NODE_ENV || 'development';
const RELEASE = process.env.RELEASE_VERSION || 'dev';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const LOKI_URL = process.env.LOKI_URL;
const LOKI_USER = process.env.LOKI_USER;
const LOKI_API_KEY = process.env.LOKI_API_KEY;
const lokiEnabled = Boolean(LOKI_URL && LOKI_USER && LOKI_API_KEY);

let warnedNoLoki = false;

function pushToLoki(level, line) {
  if (!lokiEnabled) {
    if (!warnedNoLoki) {
      warnedNoLoki = true;
      console.warn('[LOKI] disabled (LOKI_URL/USER/API_KEY not all set) — Admin logs are console-only.');
    }
    return Promise.resolve();
  }
  const url = `${LOKI_URL.replace(/\/$/, '')}/loki/api/v1/push`;
  const auth = Buffer.from(`${LOKI_USER}:${LOKI_API_KEY}`).toString('base64');
  const body = JSON.stringify({
    streams: [{
      // Low-cardinality labels only; ids live in the JSON line.
      stream: { service: SERVICE, env: ENV, level },
      values: [[String(Date.now() * 1e6), line]],
    }],
  });
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body,
  }).catch((err) => {
    // Never let logging break a request.
    console.error('[LOKI] push failed:', err && err.message);
  });
}

function emit(level, message, meta) {
  if (LEVELS[level] > (LEVELS[LOG_LEVEL] ?? 2)) return;

  const record = redact({
    level,
    message: typeof message === 'string' ? message : JSON.stringify(message),
    service: SERVICE,
    env: ENV,
    releaseVersion: RELEASE,
    timestamp: new Date().toISOString(),
    ...(meta || {}),
  });

  // Console
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleFn(`[${level.toUpperCase()}] ${record.timestamp} - ${record.message}`, meta ? record : '');

  // Loki (fire-and-forget; awaited internally with a catch)
  void pushToLoki(level, JSON.stringify(record));
}

function makeLogger(bound = {}) {
  return {
    info: (message, meta = {}) => emit('info', message, { ...bound, ...meta }),
    warn: (message, meta = {}) => emit('warn', message, { ...bound, ...meta }),
    debug: (message, meta = {}) => emit('debug', message, { ...bound, ...meta }),
    // Backward-compatible error signature: (message, error, meta)
    error: (message, error = {}, meta = {}) => emit('error', message, {
      ...bound,
      errMessage: error?.message || (typeof error === 'string' ? error : undefined),
      stack: error?.stack,
      ...(error && !error.message && !error.stack && typeof error === 'object' ? error : {}),
      ...meta,
    }),
    child: (extra = {}) => makeLogger({ ...bound, ...extra }),
    /**
     * Per-request child logger: reuses/echoes x-request-id and binds operator id.
     * @param {Request} req - the Next.js Request (Headers).
     * @param {object} extra - e.g. { operatorId }.
     */
    withRequest: (req, extra = {}) => {
      let requestId;
      try { requestId = req?.headers?.get?.('x-request-id'); } catch { /* noop */ }
      if (!requestId) requestId = (globalThis.crypto?.randomUUID?.() || `adm-${Date.now()}`);
      return makeLogger({ ...bound, requestId, ...extra });
    },
  };
}

const logger = makeLogger();
logger.lokiEnabled = lokiEnabled;

export default logger;
