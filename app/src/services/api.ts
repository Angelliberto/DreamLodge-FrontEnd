import axios from 'axios';
import { LoginRequest, LoginResponse, RegisterRequest, AuthResponse } from "../types";


const API_URL = "http://localhost:3000/api"; // Replace with your actual backend API URL


export async function login(data:LoginRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${API_URL}/users/login`, data);
  return response.data;
}

export async function register(data:RegisterRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(`${API_URL}/users/register`, data);
  return response.data;
}

