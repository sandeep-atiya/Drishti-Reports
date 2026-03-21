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
 */
export const pollJobUntilDone = (jobId, { intervalMs = 3000, onProgress } = {}) =>
  new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const result = await fetchJobStatus(jobId);
        if (result.status === 'completed') return resolve(result);
        if (result.status === 'failed')    return reject(new Error(result.message || 'Job failed'));
        if (onProgress) onProgress(result.status); // 'waiting' | 'active'
        setTimeout(tick, intervalMs);
      } catch (err) {
        reject(err);
      }
    };
    tick();
  });
