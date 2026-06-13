export type UserRole = 'User' | 'Admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
