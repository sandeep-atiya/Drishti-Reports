import apiClient from '../../../services/apiClient';

export const loginRequest = ({ login, password }) =>
  apiClient
    .post('/auth/login', { login, password })
    .then((r) => r.data);
