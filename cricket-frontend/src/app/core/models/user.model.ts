import { Locality } from './locality.model';

export type UserRole = 'admin' | 'scorer' | 'viewer';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  locality?: Locality | string | null;
  avatar?: string | null;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  localityId?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}
