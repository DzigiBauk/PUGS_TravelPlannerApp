import type { AppEnvironment } from '../config/environment';
import { createApiClient } from './apiClient';
import { createAuthService, type AuthService } from './authService';
import { createRouteService, type RouteService } from './routeService';
import { createTravelPlanService, type TravelPlanService } from './travelPlanService';

export interface AppServices {
  authService: AuthService;
  travelPlanService: TravelPlanService;
  routeService: RouteService;
}

export function createAppServices(environment: AppEnvironment): AppServices {
  return {
    authService: createAuthService(createApiClient(environment.userServiceUrl)),
    travelPlanService: createTravelPlanService(createApiClient(environment.travelPlanServiceUrl)),
    routeService: createRouteService(createApiClient(environment.routeServiceUrl)),
  };
}
