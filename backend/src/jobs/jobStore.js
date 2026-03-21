/**
 * In-process job store for background report generation.
 * Uses a simple Map — no Redis version requirement.
 * Jobs auto-expire after 1 hour to avoid memory leaks.
 */

const TTL_MS = 60 * 60 * 1000; // 1 hour
const store = new Map();

export const createJob = (id, asyncFn) => {
  store.set(id, { status: 'active', result: null, error: null });

  asyncFn()
    .then((result) => {
      store.set(id, { status: 'completed', result });
    })
    .catch((err) => {
      store.set(id, { status: 'failed', error: err.message || 'Unknown error' });
    })
    .finally(() => {
      // Auto-cleanup after TTL
      setTimeout(() => store.delete(id), TTL_MS);
    });
};

export const getJob = (id) => store.get(id) ?? null;
