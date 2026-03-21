import apiClient from '../../../services/apiClient';

export const fetchDrishtiReport = ({ startDate, endDate }) =>
  apiClient
    .get('/reports/drishti', { params: { startDate, endDate } })
    .then((r) => r.data);
