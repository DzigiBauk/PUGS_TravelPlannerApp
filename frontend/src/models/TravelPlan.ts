import type { Expense } from './Expense';

export interface TravelPlan {
  id: number;
  userId: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget: number;
  totalExpenses?: number;
  remainingBudget?: number;
  notes?: string;
  createdAt: string;
  destinations?: Destination[];
  activities?: Activity[];
  expenses?: Expense[];
  checklistItems?: ChecklistItem[];
}

export interface AdminTravelPlan {
  id: number;
  userId: number;
  name: string;
  startDate: string;
  endDate: string;
  budget: number;
  totalExpenses: number;
  createdAt: string;
}

export interface Destination {
  id: number;
  travelPlanId: number;
  name: string;
  location: string;
  arrivalDate: string;
  departureDate: string;
  description?: string;
}

export interface DestinationRequestDto {
  name: string;
  location: string;
  arrivalDate: string;
  departureDate: string;
  description?: string;
}

export interface Activity {
  id: number;
  travelPlanId: number;
  destinationId?: number;
  name: string;
  date: string;
  time: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  estimatedCost?: number;
  status: 'planned' | 'reserved' | 'completed' | 'cancelled';
}

export interface ActivityRequestDto {
  destinationId?: number;
  name: string;
  date: string;
  time: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  estimatedCost?: number;
  status: Activity['status'];
}

export interface ChecklistItem {
  id: number;
  travelPlanId: number;
  name: string;
  isCompleted: boolean;
}

export interface ChecklistItemRequestDto {
  name: string;
  isCompleted: boolean;
}

export interface ShareToken {
  id: number;
  travelPlanId: number;
  token: string;
  accessType: 'VIEW' | 'EDIT';
  createdAt: string;
  expiresAt?: string;
}

export interface ShareTokenRequestDto {
  accessType: 'VIEW' | 'EDIT';
  expiresAt?: string;
}

export interface SharedPlanAccess {
  accessType: 'VIEW' | 'EDIT';
}
