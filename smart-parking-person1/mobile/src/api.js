import axios from 'axios';
import { API_URL } from './config';

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

let token = null;
export const setToken = (t) => { token = t; };

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turns any error into a readable message
export const errMsg = (e) =>
  e?.response?.data?.message ||
  (e?.code === 'ECONNABORTED' || e?.message === 'Network Error'
    ? 'Cannot reach server. Check that the backend is running and API_URL in src/config.js is correct.'
    : e?.message || 'Something went wrong');
