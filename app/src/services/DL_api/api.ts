import axios from 'axios';
import { getBackendEndpoint } from "../../config/api";
import { AuthResponse, LoginRequest, RegisterRequest } from "../../types";

export async function login(data:LoginRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(getBackendEndpoint('/users/login'), data);
  return response.data;
}

export async function register(data:RegisterRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(getBackendEndpoint('/users/register'), data);
  return response.data;
}

