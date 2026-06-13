import axios from 'axios';
import type {
  TravelPlan,
  AdminTravelPlan,
  Activity,
  ActivityRequestDto,
  ChecklistItem,
  ChecklistItemRequestDto,
  Destination,
  DestinationRequestDto,
  ShareToken,
  ShareTokenRequestDto,
  SharedPlanAccess,
} from '../models/TravelPlan';
import { ExpenseCategory, type Expense, type ExpenseRequestDto } from '../models/Expense';
import { environment } from '../config/environment';

const api = axios.create({
  baseURL: environment.travelPlanServiceUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface TravelPlanRequestDto {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  budget: number;
  notes?: string;
}

type BackendExpenseCategory = ExpenseCategory | string;

interface BackendExpense extends Omit<Expense, 'category'> {
  category: BackendExpenseCategory | string;
}

interface BackendActivity extends Omit<Activity, 'status'> {
  status: string;
}

interface BackendTravelPlan extends Omit<TravelPlan, 'expenses' | 'activities'> {
  expenses?: BackendExpense[];
  activities?: BackendActivity[];
}

const expenseCategoryToApi: Record<ExpenseCategory, BackendExpenseCategory> = {
  [ExpenseCategory.Transport]: 'Transport',
  [ExpenseCategory.Accommodation]: 'Accommodation',
  [ExpenseCategory.Food]: 'Food',
  [ExpenseCategory.Tickets]: 'Tickets',
  [ExpenseCategory.Shopping]: 'Shopping',
  [ExpenseCategory.Other]: 'Other',
};

const expenseCategoryFromApi: Record<string, ExpenseCategory> = {
  Transport: ExpenseCategory.Transport,
  Accommodation: ExpenseCategory.Accommodation,
  Food: ExpenseCategory.Food,
  Tickets: ExpenseCategory.Tickets,
  Shopping: ExpenseCategory.Shopping,
  Other: ExpenseCategory.Other,
  Prevoz: ExpenseCategory.Transport,
  'Smje\u0161taj': ExpenseCategory.Accommodation,
  'Smje\u00c5\u00a1taj': ExpenseCategory.Accommodation,
  Hrana: ExpenseCategory.Food,
  Ulaznice: ExpenseCategory.Tickets,
  Kupovina: ExpenseCategory.Shopping,
  Ostalo: ExpenseCategory.Other,
};

const activityStatusFromApi: Record<string, Activity['status']> = {
  Planned: 'planned',
  Reserved: 'reserved',
  Completed: 'completed',
  Cancelled: 'cancelled',
  Planirano: 'planned',
  Rezervisano: 'reserved',
  'Zavr\u0161eno': 'completed',
  'Zavr\u00c5\u00a1eno': 'completed',
  Otkazano: 'cancelled',
};

const activityStatusToApi: Record<Activity['status'], string> = {
  planned: 'Planned',
  reserved: 'Reserved',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function toApiExpenseRequest(dto: ExpenseRequestDto) {
  return {
    ...dto,
    category: expenseCategoryToApi[dto.category] ?? 'Other',
  };
}

function normalizeExpense(expense: BackendExpense): Expense {
  return {
    ...expense,
    category: expenseCategoryFromApi[expense.category] ?? ExpenseCategory.Other,
  };
}

function normalizeActivity(activity: BackendActivity): Activity {
  return {
    ...activity,
    status: activityStatusFromApi[activity.status] ?? 'planned',
  };
}

function toApiActivityRequest(dto: ActivityRequestDto) {
  return {
    ...dto,
    status: activityStatusToApi[dto.status],
  };
}

function normalizeTravelPlan(plan: BackendTravelPlan): TravelPlan {
  return {
    ...plan,
    expenses: plan.expenses?.map(normalizeExpense),
    activities: plan.activities?.map(normalizeActivity),
  };
}

export const travelPlanService = {
  getAdminTravelPlans: async (): Promise<AdminTravelPlan[]> => {
    const response = await api.get<AdminTravelPlan[]>('/admin/travel-plans');
    return response.data;
  },

  deleteAdminTravelPlan: async (id: number): Promise<void> => {
    await api.delete(`/admin/travel-plans/${id}`);
  },

  getAll: async (): Promise<TravelPlan[]> => {
    const response = await api.get<BackendTravelPlan[]>('/travel-plans');
    return response.data.map(normalizeTravelPlan);
  },

  getById: async (id: number): Promise<TravelPlan> => {
    const response = await api.get<BackendTravelPlan>(`/travel-plans/${id}`);
    return normalizeTravelPlan(response.data);
  },

  create: async (data: TravelPlanRequestDto): Promise<TravelPlan> => {
    const response = await api.post<BackendTravelPlan>('/travel-plans', data);
    return normalizeTravelPlan(response.data);
  },

  update: async (id: number, data: TravelPlanRequestDto): Promise<void> => {
    await api.put(`/travel-plans/${id}`, data);
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/travel-plans/${id}`);
  },

  getDestinations: async (planId: number): Promise<Destination[]> => {
    const response = await api.get<Destination[]>(`/travel-plans/${planId}/destinations`);
    return response.data;
  },

  createDestination: async (planId: number, dto: DestinationRequestDto): Promise<Destination> => {
    const response = await api.post<Destination>(`/travel-plans/${planId}/destinations`, dto);
    return response.data;
  },

  updateDestination: async (planId: number, destinationId: number, dto: DestinationRequestDto): Promise<void> => {
    await api.put(`/travel-plans/${planId}/destinations/${destinationId}`, dto);
  },

  deleteDestination: async (planId: number, destinationId: number): Promise<void> => {
    await api.delete(`/travel-plans/${planId}/destinations/${destinationId}`);
  },

  getActivities: async (planId: number): Promise<Activity[]> => {
    const response = await api.get<BackendActivity[]>(`/travel-plans/${planId}/activities`);
    return response.data.map(normalizeActivity);
  },

  createActivity: async (planId: number, dto: ActivityRequestDto): Promise<Activity> => {
    const response = await api.post<BackendActivity>(
      `/travel-plans/${planId}/activities`,
      toApiActivityRequest(dto),
    );
    return normalizeActivity(response.data);
  },

  updateActivity: async (planId: number, activityId: number, dto: ActivityRequestDto): Promise<void> => {
    await api.put(`/travel-plans/${planId}/activities/${activityId}`, toApiActivityRequest(dto));
  },

  deleteActivity: async (planId: number, activityId: number): Promise<void> => {
    await api.delete(`/travel-plans/${planId}/activities/${activityId}`);
  },

  getExpenses: async (planId: number): Promise<Expense[]> => {
    const response = await api.get<BackendExpense[]>(`/travel-plans/${planId}/expenses`);
    return response.data.map(normalizeExpense);
  },

  createExpense: async (planId: number, dto: ExpenseRequestDto): Promise<Expense> => {
    const response = await api.post<BackendExpense>(`/travel-plans/${planId}/expenses`, toApiExpenseRequest(dto));
    return normalizeExpense(response.data);
  },

  updateExpense: async (planId: number, expenseId: number, dto: ExpenseRequestDto): Promise<void> => {
    await api.put(`/travel-plans/${planId}/expenses/${expenseId}`, toApiExpenseRequest(dto));
  },

  deleteExpense: async (planId: number, expenseId: number): Promise<void> => {
    await api.delete(`/travel-plans/${planId}/expenses/${expenseId}`);
  },

  getChecklistItems: async (planId: number): Promise<ChecklistItem[]> => {
    const response = await api.get<ChecklistItem[]>(`/travel-plans/${planId}/checklist`);
    return response.data;
  },

  createChecklistItem: async (planId: number, dto: ChecklistItemRequestDto): Promise<ChecklistItem> => {
    const response = await api.post<ChecklistItem>(`/travel-plans/${planId}/checklist`, dto);
    return response.data;
  },

  updateChecklistItem: async (
    planId: number,
    itemId: number,
    dto: ChecklistItemRequestDto,
  ): Promise<void> => {
    await api.put(`/travel-plans/${planId}/checklist/${itemId}`, dto);
  },

  deleteChecklistItem: async (planId: number, itemId: number): Promise<void> => {
    await api.delete(`/travel-plans/${planId}/checklist/${itemId}`);
  },

  getShareTokens: async (planId: number): Promise<ShareToken[]> => {
    const response = await api.get<ShareToken[]>(`/travel-plans/${planId}/share`);
    return response.data;
  },

  createShareToken: async (planId: number, dto: ShareTokenRequestDto): Promise<ShareToken> => {
    const response = await api.post<ShareToken>(`/travel-plans/${planId}/share`, dto);
    return response.data;
  },

  revokeShareToken: async (planId: number, tokenId: number): Promise<void> => {
    await api.delete(`/travel-plans/${planId}/share/${tokenId}`);
  },

  getSharedPlan: async (token: string): Promise<TravelPlan> => {
    const response = await api.get<BackendTravelPlan>(`/shared/${encodeURIComponent(token)}`);
    return normalizeTravelPlan(response.data);
  },

  getSharedPlanAccess: async (token: string): Promise<SharedPlanAccess> => {
    const response = await api.get<SharedPlanAccess>(`/shared/${encodeURIComponent(token)}/access`);
    return response.data;
  },

  updateSharedPlan: async (token: string, dto: TravelPlanRequestDto): Promise<void> => {
    await api.put(`/shared/${encodeURIComponent(token)}/plan`, dto);
  },

  createSharedDestination: async (token: string, dto: DestinationRequestDto): Promise<Destination> => {
    const response = await api.post<Destination>(`/shared/${encodeURIComponent(token)}/destinations`, dto);
    return response.data;
  },

  updateSharedDestination: async (token: string, id: number, dto: DestinationRequestDto): Promise<void> => {
    await api.put(`/shared/${encodeURIComponent(token)}/destinations/${id}`, dto);
  },

  deleteSharedDestination: async (token: string, id: number): Promise<void> => {
    await api.delete(`/shared/${encodeURIComponent(token)}/destinations/${id}`);
  },

  createSharedActivity: async (token: string, dto: ActivityRequestDto): Promise<Activity> => {
    const response = await api.post<BackendActivity>(
      `/shared/${encodeURIComponent(token)}/activities`,
      toApiActivityRequest(dto),
    );
    return normalizeActivity(response.data);
  },

  updateSharedActivity: async (token: string, id: number, dto: ActivityRequestDto): Promise<void> => {
    await api.put(`/shared/${encodeURIComponent(token)}/activities/${id}`, toApiActivityRequest(dto));
  },

  deleteSharedActivity: async (token: string, id: number): Promise<void> => {
    await api.delete(`/shared/${encodeURIComponent(token)}/activities/${id}`);
  },

  createSharedExpense: async (token: string, dto: ExpenseRequestDto): Promise<Expense> => {
    const response = await api.post<BackendExpense>(
      `/shared/${encodeURIComponent(token)}/expenses`,
      toApiExpenseRequest(dto),
    );
    return normalizeExpense(response.data);
  },

  updateSharedExpense: async (token: string, id: number, dto: ExpenseRequestDto): Promise<void> => {
    await api.put(`/shared/${encodeURIComponent(token)}/expenses/${id}`, toApiExpenseRequest(dto));
  },

  deleteSharedExpense: async (token: string, id: number): Promise<void> => {
    await api.delete(`/shared/${encodeURIComponent(token)}/expenses/${id}`);
  },

  createSharedChecklistItem: async (token: string, dto: ChecklistItemRequestDto): Promise<ChecklistItem> => {
    const response = await api.post<ChecklistItem>(`/shared/${encodeURIComponent(token)}/checklist`, dto);
    return response.data;
  },

  updateSharedChecklistItem: async (token: string, id: number, dto: ChecklistItemRequestDto): Promise<void> => {
    await api.put(`/shared/${encodeURIComponent(token)}/checklist/${id}`, dto);
  },

  deleteSharedChecklistItem: async (token: string, id: number): Promise<void> => {
    await api.delete(`/shared/${encodeURIComponent(token)}/checklist/${id}`);
  },
};

export default api;
