import { api } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";

/** The user as the server sends it, with the avatar: an uploaded photo (file
 * id) or a ready-made avatar key; neither means initials. */
export type AvatarUser = AuthUser & { avatarFileId?: string | null; avatarKey?: string | null };

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export async function login(payload: LoginPayload) {
  const res = await api.post<{ data: { accessToken: string; user: AuthUser } }>("/auth/login", payload);
  return res.data.data;
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

/** The signed-in user's avatar: a ready-made one by key, or null for initials. */
export async function setAvatar(avatarKey: string | null) {
  const res = await api.put("/auth/avatar", { avatarKey });
  return res.data.data as AvatarUser;
}

/** Uploads the signed-in user's photo (already cropped to a square). */
export async function uploadAvatarPhoto(photo: Blob) {
  const form = new FormData();
  form.append("file", photo, "avatar.jpg");
  const res = await api.post("/auth/avatar/photo", form, { headers: { "Content-Type": "multipart/form-data" } });
  return res.data.data as AvatarUser;
}
