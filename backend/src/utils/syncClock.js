const FLAG_OFFSET_MS = 5 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 2 * 60 * 1000;
const MAX_LAG_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_OFFSET_MS = 365 * 24 * 60 * 60 * 1000;
const KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,100}$/;

function parseInstant(value) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  const parsed = /^\d{10,}$/.test(text) ? Number(text) : Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOffset(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > MAX_OFFSET_MS) return null;
  return Math.round(parsed);
}

function parseSyncHeaders(headers) {
  const rawKey = headers['idempotency-key'];
  const key = typeof rawKey === 'string' && KEY_PATTERN.test(rawKey.trim()) ? rawKey.trim() : null;
  return {
    key,
    keyInvalid: Boolean(rawKey) && !key,
    clientCreatedAtMs: parseInstant(headers['x-client-created-at']),
    offsetMs: parseOffset(headers['x-clock-offset-ms']),
  };
}

function resolveTiming({ clientCreatedAtMs, offsetMs }, receivedMs) {
  const serverReceivedAt = new Date(receivedMs);

  if (clientCreatedAtMs === null) {
    return {
      clientCreatedAt: null,
      serverReceivedAt,
      offsetMs: null,
      trustedAt: serverReceivedAt,
      flagged: false,
    };
  }

  let trustedMs = receivedMs;
  let flagged = false;

  if (offsetMs !== null) {
    const corrected = clientCreatedAtMs + offsetMs;
    const ahead = corrected - receivedMs;
    const lag = receivedMs - corrected;
    if (ahead > FUTURE_TOLERANCE_MS || lag > MAX_LAG_MS) {
      flagged = true;
    } else {
      trustedMs = Math.min(corrected, receivedMs);
    }
    if (Math.abs(offsetMs) > FLAG_OFFSET_MS) flagged = true;
  } else {
    const ahead = clientCreatedAtMs - receivedMs;
    const lag = receivedMs - clientCreatedAtMs;
    flagged = ahead > FUTURE_TOLERANCE_MS || lag > MAX_LAG_MS;
  }

  return {
    clientCreatedAt: new Date(clientCreatedAtMs),
    serverReceivedAt,
    offsetMs,
    trustedAt: new Date(trustedMs),
    flagged,
  };
}

module.exports = { parseSyncHeaders, resolveTiming };
