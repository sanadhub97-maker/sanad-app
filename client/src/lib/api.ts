import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/authStore";
import i18n, { tr, isRtlLanguage } from "@/i18n";
import { localizeServerMessage } from "@/lib/server-messages";

/* Shown inside another site's frame (sanad-hr.sept.cloud), some browsers keep
   no cookie for the app (Safari, above all on iPhone and iPad), so a reload
   would sign the user out. There the app says so (X-Embedded) and keeps the
   refresh token itself, in this frame's own storage. */
const framed = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const RT_KEY = "sanad.rt";
export function keepRefreshToken(token?: unknown) {
  if (!framed) return;
  try {
    if (typeof token === "string" && token) localStorage.setItem(RT_KEY, token);
    else localStorage.removeItem(RT_KEY);
  } catch {
    /* storage blocked: the cookie is all there is */
  }
}
export function keptRefreshToken(): string | undefined {
  if (!framed) return undefined;
  try {
    return localStorage.getItem(RT_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}
const embeddedHeaders = framed ? { "X-Embedded": "1" } : {};

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // send the httpOnly refresh_token cookie
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // PDFs and exports come back in the interface language.
  config.headers["X-UI-Lang"] = isRtlLanguage(i18n.language) ? "ar" : "en";
  if (framed) config.headers["X-Embedded"] = "1";
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post("/api/auth/refresh", framed ? { refreshToken: keptRefreshToken() } : {}, { withCredentials: true, headers: embeddedHeaders })
      .then((res) => {
        const { accessToken, user, refreshToken } = res.data.data;
        keepRefreshToken(refreshToken);
        useAuthStore.getState().setAuth(accessToken, user);
        return accessToken as string;
      })
      .catch(() => {
        keepRefreshToken(undefined);
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
