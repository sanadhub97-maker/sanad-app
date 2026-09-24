import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";
import { tr } from "@/i18n";
import { localizeServerMessage } from "@/lib/server-messages";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // send the httpOnly refresh_token cookie
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post("/api/auth/refresh", {}, { withCredentials: true })
      .then((res) => {
        const { accessToken, user } = res.data.data;
        useAuthStore.getState().setAuth(accessToken, user);
        return accessToken as string;
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => {
    // Success toasts show the server's message; put it in the UI language.
    const body = response.data as { message?: unknown } | undefined;
    if (body && typeof body === "object" && !(body instanceof Blob) && typeof body.message === "string") {
      body.message = localizeServerMessage(body.message);
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried && !original.url?.includes("/auth/")) {
      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiErrorShape {
  error: { code: string; message: string; details?: unknown };
}

export function getErrorMessage(
  err: unknown,
  fallback = tr("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.", "Something went wrong. Please try again.")
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorShape | undefined;
    if (data?.error?.message) return localizeServerMessage(data.error.message);
    if (err.response?.status === 401) return tr("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.", "Your session has expired. Please sign in again.");
    if (err.response?.status === 403) return tr("ليس لديك الصلاحية الكافية للوصول إلى هذا المحتوى أو الإجراء.", "You don't have permission for this action.");
    if (err.response?.status === 404) return tr("المورد أو التقرير المطلوب غير موجود.", "The requested item was not found.");
    if (err.response?.status === 500) return tr("حدث خطأ داخلي في الخادم أثناء معالجة الطلب.", "The server hit an error while processing the request.");
  }
  return fallback;
}

export async function extractErrorMessage(
  err: unknown,
  fallback = tr("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.", "Something went wrong. Please try again.")
): Promise<string> {
  if (axios.isAxiosError(err)) {
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const json = JSON.parse(text);
        if (json?.error?.message) return localizeServerMessage(json.error.message);
      } catch {}
    }
    return getErrorMessage(err, fallback);
  }
  return fallback;
}

export { refreshAccessToken };
