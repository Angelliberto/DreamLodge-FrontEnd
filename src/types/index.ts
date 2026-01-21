export interface User {
  _id: string;
  name: string;
  email: string;
  birthdate: string; 
  two_fa_enabled: boolean;
  deleted: boolean;
  createdAt: string; 
  updatedAt: string; 
  preferences: Preferences;
  emotional_profile: EmotionalProfile;
  __v: number;
}

export interface Preferences {
  favorite_types: string[];
  favorite_genres: string[];
}

export interface EmotionalProfile {
  common_emotions: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
}


export interface ApiError {
  type: string;
  path?: string;
  location?:string;
  msg: string;
  value?: unknown;
  code?: string | number;
  meta: Record<string,any>;
}

export interface ApiErrorResponse {
  errors: ApiError[];
}


export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  birthdate: string;
  confirmPassword: string;
}
