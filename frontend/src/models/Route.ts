export interface RoutePoint {
  activityId: number;
  name: string;
  date: string;
  time: string;
  location?: string;
  latitude: number;
  longitude: number;
}

export interface RouteSegment {
  fromActivityId: number;
  toActivityId: number;
  distanceKilometers: number;
  estimatedDurationMinutes: number;
}

export interface TravelRoute {
  travelPlanId: number;
  date?: string;
  generatedAt: string;
  fromCache: boolean;
  points: RoutePoint[];
  segments: RouteSegment[];
  totalDistanceKilometers: number;
  estimatedDurationMinutes: number;
}
