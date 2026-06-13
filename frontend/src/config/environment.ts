function requireEnvironmentVariable(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not configured.`);
  }

  return value;
}

export const environment = {
  userServiceUrl: requireEnvironmentVariable('VITE_USER_SERVICE_URL'),
  travelPlanServiceUrl: requireEnvironmentVariable('VITE_TRAVEL_PLAN_SERVICE_URL'),
  routeServiceUrl: requireEnvironmentVariable('VITE_ROUTE_SERVICE_URL'),
  mapTileUrl: requireEnvironmentVariable('VITE_MAP_TILE_URL'),
  mapTileAttribution: requireEnvironmentVariable('VITE_MAP_TILE_ATTRIBUTION'),
};
