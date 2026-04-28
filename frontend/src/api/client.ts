import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
