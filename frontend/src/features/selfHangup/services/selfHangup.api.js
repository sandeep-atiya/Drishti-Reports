import apiClient from '../../../services/apiClient';

export const fetchSelfHangupReport = ({ startDate, endDate, campaignName }) =>
  apiClient
    .get('/reports/selfhangup', {
      params:  { startDate, endDate, ...(campaignName ? { campaignName } : {}) },
      timeout: 60000,
    })
    .then((r) => r.data);

export const fetchSelfHangupJobStatus = (jobId) =>
  apiClient
    .get(`/reports/selfhangup/jobs/${jobId}`)
    .then((r) => r.data);

export const fetchSelfHangupCampaigns = () =>
  apiClient
    .get('/reports/selfhangup/campaigns')
    .then((r) => r.data.campaigns || []);

export const pollSelfHangupJobUntilDone = (jobId, { intervalMs = 3000, onProgress, signal } = {}) =>
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
        const result = await fetchSelfHangupJobStatus(jobId);
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
