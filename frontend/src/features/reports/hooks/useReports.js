import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchDrishtiReport, pollJobUntilDone } from '../services/report.api';

const POLL_INTERVAL = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 3000;

export const useReports = () => {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError]           = useState(null);

  // Holds the AbortController for the currently in-flight fetch/poll.
  const abortRef = useRef(null);

  // Cancel any pending request when the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchReport = useCallback(async ({ startDate, endDate }) => {
    // Cancel any previous in-flight request before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setLoadingMsg('Fetching report...');
    setError(null);

    try {
      const response = await fetchDrishtiReport({ startDate, endDate });
      if (controller.signal.aborted) return;

      if (response.async) {
        // Large date range — poll until the background job finishes.
        setLoadingMsg('Large date range detected. Processing in background...');
        const result = await pollJobUntilDone(response.jobId, {
          intervalMs: POLL_INTERVAL,
          signal: controller.signal,
          onProgress: (status) => {
            if (!controller.signal.aborted) {
              setLoadingMsg(status === 'active' ? 'Processing data...' : 'Waiting in queue...');
            }
          },
        });
        if (!controller.signal.aborted) setData(result);
      } else {
        setData(response);
      }
    } catch (err) {
      // Silently ignore aborts (unmount or re-fetch triggered).
      if (err.name === 'AbortError') return;
      setError(err.response?.data?.message || err.message || 'Failed to fetch report');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMsg('');
      }
    }
  }, []);

  return { data, loading, loadingMsg, error, fetchReport };
};
