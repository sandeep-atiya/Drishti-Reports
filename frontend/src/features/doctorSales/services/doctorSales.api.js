import apiClient from '../../../services/apiClient';

export const fetchDoctorSalesReport = ({ startDate, endDate }) =>
  apiClient
    .get('/reports/doctor-sales', {
      params:  { startDate, endDate },
      timeout: 60000,
    })
    .then((r) => r.data);

export const fetchDoctorSalesJobStatus = (jobId) =>
  apiClient
    .get(`/reports/doctor-sales/jobs/${jobId}`)
    .then((r) => r.data);

export const pollDoctorSalesJobUntilDone = (jobId, { intervalMs = 3000, onProgress, signal } = {}) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Polling aborted', 'AbortError'));

    let timer;
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Polling aborted', 'AbortError'));
    }, { once: true });

    const tick = async () => {
      if (signal?.aborted) return;
      try {
        const result = await fetchDoctorSalesJobStatus(jobId);
        if (signal?.aborted) return;
        if (result.status === 'completed') return resolve(result);
        if (result.status === 'failed')    return reject(new Error(result.message || 'Job failed'));
        if (onProgress) onProgress(result.status);
        timer = setTimeout(tick, intervalMs);
      } catch (err) {
        if (!signal?.aborted) reject(err);
      }
    };

    tick();
  });

