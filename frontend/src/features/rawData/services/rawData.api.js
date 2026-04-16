import apiClient from '../../../services/apiClient';

export const fetchRawData = (params) =>
  apiClient
    .get('/reports/raw-data', {
      params,
      timeout: 60000,
    })
    .then((r) => r.data);
