export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success?: boolean;
  message?: string;
  errors?: string[];
  token?: string;
  accessToken?: string;
  userId?: string;
  name?: string;
  data?: {
    token?: string;
    accessToken?: string;
    userId?: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message?: string;
  data?: unknown;
}
