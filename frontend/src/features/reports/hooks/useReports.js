import { useState, useCallback } from 'react';
import { fetchDrishtiReport } from '../services/report.api';

export const useReports = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchReport = useCallback(async ({ startDate, endDate }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDrishtiReport({ startDate, endDate });
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchReport };
};
