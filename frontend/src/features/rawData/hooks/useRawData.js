import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchRawData } from '../services/rawData.api';

export const useRawData = () => {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [lastParams, setLastParams] = useState(null);

  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const fetchReport = useCallback(async (params) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setData(null);
    setLoading(true);
    setError(null);
    setLastParams(params);

    try {
      const response = await fetchRawData(params);
      if (!controller.signal.aborted) setData(response);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.response?.data?.message || err.message || 'Failed to fetch data');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchReport, lastParams };
};
