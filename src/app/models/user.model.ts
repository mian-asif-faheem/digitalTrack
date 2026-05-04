export interface User {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

export enum UserRole {
  USER = 'user',
  SALES_TEAM = 'sales_team',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}
