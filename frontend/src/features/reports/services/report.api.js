import apiClient from '../../../services/apiClient';

export const fetchDrishtiReport = ({ startDate, endDate }) =>
  apiClient
    .get('/reports/drishti', { params: { startDate, endDate } })
    .then((r) => r.data);

export const fetchJobStatus = (jobId) =>
  apiClient
    .get(`/reports/drishti/jobs/${jobId}`)
    .then((r) => r.data);

/**
 * Polls a job every `intervalMs` until status is 'completed' or 'failed'.
 * Calls `onProgress` on each poll so the UI can show a message.
 * Pass an AbortSignal via `signal` to cancel polling (e.g. on unmount).
 */
export const pollJobUntilDone = (jobId, { intervalMs = 3000, onProgress, signal } = {}) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException('Polling aborted', 'AbortError'));
    }

    let timer;

    // Reject and clean up immediately when the signal fires
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Polling aborted', 'AbortError'));
    }, { once: true });

    const tick = async () => {
      if (signal?.aborted) return;
      try {
        const result = await fetchJobStatus(jobId);
        if (signal?.aborted) return;

        if (result.status === 'completed') return resolve(result);
        if (result.status === 'failed')    return reject(new Error(result.message || 'Job failed'));

        if (onProgress) onProgress(result.status); // 'waiting' | 'active'
        timer = setTimeout(tick, intervalMs);
      } catch (err) {
        if (!signal?.aborted) reject(err);
      }
    };

    tick();
  });
