import type { AxiosInstance } from 'axios';
import type { RegisterRequest, LoginRequest, AuthResponse, UpdateUserRequest, User, UserRole } from '../models/User';

export interface AuthService {
  register(data: RegisterRequest): Promise<AuthResponse>;
  login(data: LoginRequest): Promise<AuthResponse>;
  getAllUsers(): Promise<User[]>;
  getCurrentUser(): Promise<User>;
  updateCurrentUser(data: UpdateUserRequest): Promise<User>;
  updateUserRole(id: number, role: UserRole): Promise<User>;
  deleteUser(id: number): Promise<void>;
}

export function createAuthService(api: AxiosInstance): AuthService {
  return {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/users/me');
    return response.data;
  },

  updateCurrentUser: async (data: UpdateUserRequest): Promise<User> => {
    const response = await api.put<User>('/users/me', data);
    return response.data;
  },

  updateUserRole: async (id: number, role: UserRole): Promise<User> => {
    const response = await api.patch<User>(`/users/${id}/role`, { role });
    return response.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
  };
}
