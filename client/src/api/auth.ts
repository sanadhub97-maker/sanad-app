import { api } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

export async function login(payload: LoginPayload) {
  const res = await api.post<{ data: { accessToken: string; user: AuthUser } }>("/auth/login", payload);
  return res.data.data;
}

export async function register(payload: RegisterPayload) {
  const res = await api.post("/auth/register", payload);
  return res.data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function fetchMe() {
  const res = await api.get<{ data: AuthUser }>("/auth/me");
  return res.data.data;
}

export async function forgotPassword(email: string) {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data as { message: string };
}

export async function resetPassword(token: string, password: string) {
  const res = await api.post("/auth/reset-password", { token, password });
  return res.data as { message: string };
}

export async function verifyEmail(token: string) {
  const res = await api.post("/auth/verify-email", { token });
  return res.data as { message: string };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await api.post("/auth/change-password", { currentPassword, newPassword });
  return res.data as { message: string };
}
