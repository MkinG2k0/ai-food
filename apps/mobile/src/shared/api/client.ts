import axios from 'axios';
import type { ApiError } from '@ai-food/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError: ApiError = {
      message: error.response?.data?.message ?? error.message ?? 'Unknown error',
      code: error.response?.data?.code ?? 'UNKNOWN',
      status: error.response?.status ?? 0,
    };
    return Promise.reject(apiError);
  }
);
