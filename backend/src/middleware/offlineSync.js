const db = require('../config/db');
const AppError = require('../utils/AppError');
const requestContext = require('../utils/requestContext');
const { parseSyncHeaders, resolveTiming } = require('../utils/syncClock');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAMPABLE_TABLES = new Set([
  'logbook_entries',
  'submissions',
  'site_visits',
  'messages',
]);
const PRUNE_AFTER_DAYS = 60;

function collectIds(body) {
  const data = body && body.data;
  if (!data) return [];
  const list = Array.isArray(data) ? data : [data];
  return list
    .map((item) => (item && typeof item.id === 'string' ? item.id : null))
    .filter((id) => id && UUID_PATTERN.test(id));
}

async function stampTiming(table, ids, timing) {
  if (!STAMPABLE_TABLES.has(table) || ids.length === 0 || !timing.clientCreatedAt) return;
  await db.query(
    `UPDATE ${table}
     SET client_created_at = COALESCE(client_created_at, $2),
         server_received_at = COALESCE(server_received_at, $3),
         clock_offset_ms = COALESCE(clock_offset_ms, $4),
         clock_flagged = clock_flagged OR $5
     WHERE id = ANY($1::uuid[])`,
    [ids, timing.clientCreatedAt, timing.serverReceivedAt, timing.offsetMs, timing.flagged]
  );
}

async function pruneReceipts() {
  if (Math.random() > 0.005) return;
  await db.query(
    `DELETE FROM sync_receipts WHERE created_at < now() - ($1 || ' days')::interval`,
    [String(PRUNE_AFTER_DAYS)]
  );
}

function offlineSync({ table } = {}) {
  return async function offlineSyncMiddleware(req, res, next) {
    try {
      const meta = parseSyncHeaders(req.headers);
      if (meta.keyInvalid) {
        throw new AppError('Invalid idempotency key', 400);
      }

      const timing = resolveTiming(meta, Date.now());
      const store = { timing };

      if (!meta.key || !req.user) {
        return requestContext.run(store, () => next());
      }

      const pathKey = req.originalUrl.split('?')[0];

      const { rows: inserted } = await db.query(
        `INSERT INTO sync_receipts
           (user_id, idempotency_key, method, path, client_created_at, server_received_at,
            clock_offset_ms, clock_flagged)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id, idempotency_key) DO NOTHING
         RETURNING id`,
        [
          req.user.id,
          meta.key,
          req.method,
          pathKey,
          timing.clientCreatedAt,
          timing.serverReceivedAt,
          timing.offsetMs,
          timing.flagged,
        ]
      );

      if (inserted.length === 0) {
        const { rows } = await db.query(
          `SELECT method, path, status_code, response_body
           FROM sync_receipts
           WHERE user_id = $1 AND idempotency_key = $2`,
          [req.user.id, meta.key]
        );
        const receipt = rows[0];
        if (!receipt) {
          throw new AppError('Please try again', 409, 'IN_PROGRESS');
        }
        if (receipt.method !== req.method || receipt.path !== pathKey) {
          throw new AppError('This idempotency key was already used for a different request', 422);
        }
        if (receipt.status_code === null) {
          throw new AppError(
            'This action is still being processed. Please try again shortly.',
            409,
            'IN_PROGRESS'
          );
        }
        res.set('Idempotent-Replay', 'true');
        return res.status(receipt.status_code).json(receipt.response_body);
      }

      const receiptId = inserted[0].id;
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        const status = res.statusCode;
        const settle =
          status < 400
            ? db
                .query(
                  `UPDATE sync_receipts
                   SET status_code = $2, response_body = $3::jsonb, completed_at = now()
                   WHERE id = $1`,
                  [receiptId, status, JSON.stringify(body === undefined ? null : body)]
                )
                .then(() => (table ? stampTiming(table, collectIds(body), timing) : null))
            : db.query('DELETE FROM sync_receipts WHERE id = $1', [receiptId]);

        settle
          .catch((err) => console.error('[offlineSync] bookkeeping failed:', err.message))
          .then(() => originalJson(body));
        return res;
      };

      res.on('close', () => {
        if (!res.writableEnded) {
          db.query('DELETE FROM sync_receipts WHERE id = $1 AND status_code IS NULL', [receiptId]).catch(
            () => {}
          );
        }
      });

      pruneReceipts().catch(() => {});
      return requestContext.run(store, () => next());
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = offlineSync;
