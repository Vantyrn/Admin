// Secret / PII redaction for Admin logs + Sentry events (workflow §4.5).
// ESM port of the backend lib/redact.js — keep the two in sync.

const REDACTED = '[REDACTED]';

const FULL_REDACT = [
  /pass(word|wd)?/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /\bauth\b/i,
  /api[-_]?key/i,
  /private[-_]?key/i,
  /\botp\b/i,
  /verification[-_]?code/i,
  /\bcvv\b/i,
  /\bcvc\b/i,
  /card[-_]?number/i,
  /\bpan\b/i,
  /razorpay[-_]?signature/i,
  /cookie/i,
];

const MASK = [
  { test: /(phone|mobile|msisdn|whatsapp)/i, fn: maskPhone },
  { test: /e?mail/i, fn: maskEmail },
  { test: /(address|street|line1|line2|landmark)/i, fn: maskGeneric },
];

const SKIP_KEYS = new Set([
  'level', 'message', 'timestamp', 'service', 'env', 'releaseVersion',
  'requestId', 'userId', 'operatorId', 'role', 'orderId', 'route', 'method',
  'statusCode', 'latencyMs',
]);

function maskPhone(v) {
  const digits = String(v).replace(/\D/g, '');
  if (digits.length < 4) return REDACTED;
  return `***${digits.slice(-4)}`;
}

function maskEmail(v) {
  const s = String(v);
  const at = s.indexOf('@');
  if (at <= 0) return REDACTED;
  return `${s[0]}***@${s.slice(at + 1)}`;
}

function maskGeneric(v) {
  const s = String(v);
  return s.length <= 4 ? REDACTED : `${s.slice(0, 2)}***`;
}

function keyAction(key) {
  for (const re of FULL_REDACT) if (re.test(key)) return 'redact';
  for (const m of MASK) if (m.test.test(key)) return m.fn;
  return null;
}

export function scrubString(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9._\-]{20,}/g, '[REDACTED_JWT]');
}

function redactDeep(value, depth, seen) {
  if (value == null) return value;
  if (depth > 6) return '[TRUNCATED_DEPTH]';
  if (typeof value === 'string') return scrubString(value);
  if (typeof value !== 'object') return value;
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (Array.isArray(value)) {
    const max = 50;
    const out = value.slice(0, max).map((v) => redactDeep(v, depth + 1, seen));
    if (value.length > max) out.push(`[+${value.length - max} more]`);
    return out;
  }

  const out = {};
  for (const key of Object.keys(value)) {
    if (SKIP_KEYS.has(key)) { out[key] = value[key]; continue; }
    const action = keyAction(key);
    if (action === 'redact') { out[key] = REDACTED; continue; }
    if (typeof action === 'function') { out[key] = action(value[key]); continue; }
    out[key] = redactDeep(value[key], depth + 1, seen);
  }
  return out;
}

export function redact(obj) {
  return redactDeep(obj, 0, new WeakSet());
}

export { REDACTED };
