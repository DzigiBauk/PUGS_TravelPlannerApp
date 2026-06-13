import axios from 'axios';
import { environment } from '../config/environment';
import type { TravelRoute } from '../models/Route';

const routeApi = axios.create({
  baseURL: environment.routeServiceUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

routeApi.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const routeService = {
  getRoute: async (planId: number, date?: string): Promise<TravelRoute> => {
    const response = await routeApi.get<TravelRoute>(`/routes/${planId}`, {
      params: date ? { date } : undefined,
    });
    return response.data;
  },
  getSharedRoute: async (token: string, date?: string): Promise<TravelRoute> => {
    const response = await routeApi.get<TravelRoute>(`/shared-routes/${encodeURIComponent(token)}`, {
      params: date ? { date } : undefined,
    });
    return response.data;
  },
};
