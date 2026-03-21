import { useState, useCallback } from 'react';
import { fetchDrishtiReport, pollJobUntilDone } from '../services/report.api';

export const useReports = () => {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError]         = useState(null);

  const fetchReport = useCallback(async ({ startDate, endDate }) => {
    setLoading(true);
    setLoadingMsg('Fetching report...');
    setError(null);
    try {
      const response = await fetchDrishtiReport({ startDate, endDate });

      if (response.async) {
        // Large date range — poll until the background job finishes
        setLoadingMsg('Large date range detected. Processing in background...');
        const result = await pollJobUntilDone(response.jobId, {
          intervalMs: 3000,
          onProgress: (status) =>
            setLoadingMsg(status === 'active' ? 'Processing data...' : 'Waiting in queue...'),
        });
        setData(result);
      } else {
        setData(response);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }, []);

  return { data, loading, loadingMsg, error, fetchReport };
};
