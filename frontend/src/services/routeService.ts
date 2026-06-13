import type { AxiosInstance } from 'axios';
import type { TravelRoute } from '../models/Route';

export interface RouteService {
  getRoute(planId: number, date?: string): Promise<TravelRoute>;
  getSharedRoute(token: string, date?: string): Promise<TravelRoute>;
}

export function createRouteService(routeApi: AxiosInstance): RouteService {
  return {
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
}
