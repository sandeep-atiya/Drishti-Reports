import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchSalesHydrabadReport,
  pollSalesHydrabadJobUntilDone,
} from '../services/salesHyderabad.api';

const POLL_INTERVAL = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 3000;

export const useSalesHyderabad = () => {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error,      setError]      = useState(null);

  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchReport = useCallback(async ({ startDate, endDate }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setData(null);
    setLoading(true);
    setLoadingMsg('Submitting report request…');
    setError(null);

    try {
      const response = await fetchSalesHydrabadReport({ startDate, endDate });
      if (controller.signal.aborted) return;

      if (!response.async) {
        setData(response);
      } else {
        setLoadingMsg('Querying databases — this may take a moment…');
        const result = await pollSalesHydrabadJobUntilDone(response.jobId, {
          intervalMs: POLL_INTERVAL,
          signal:     controller.signal,
          onProgress: (status) => {
            if (!controller.signal.aborted) {
              setLoadingMsg(status === 'active' ? 'Processing report data…' : 'Waiting in queue…');
            }
          },
        });
        if (!controller.signal.aborted) setData(result);
      }
    } catch (err) {
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
