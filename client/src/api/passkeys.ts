import { api, keepRefreshToken } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

export const passkeysSupported = () => typeof window !== "undefined" && window.isSecureContext && "PublicKeyCredential" in window;
export type PasskeyItem = { id: string; name: string; rpId: string; createdAt: string; lastUsedAt: string | null };
export async function listPasskeys() { return (await api.get<{ data: PasskeyItem[] }>("/auth/passkeys")).data.data; }
export async function registerPasskey(password: string, name: string) {
  const { startRegistration } = await import("@simplewebauthn/browser");
  const { data: { data } } = await api.post<{ data: { options: PublicKeyCredentialCreationOptionsJSON; ceremonyId: string } }>("/auth/passkeys/register/options", { password });
  const response = await startRegistration({ optionsJSON: data.options });
  await api.post("/auth/passkeys/register/verify", { ceremonyId: data.ceremonyId, response, name });
}
export async function loginWithPasskey(rememberMe: boolean) {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const { data: { data } } = await api.post<{ data: { options: PublicKeyCredentialRequestOptionsJSON; ceremonyId: string } }>("/auth/passkeys/login/options", { rememberMe });
  const response = await startAuthentication({ optionsJSON: data.options });
  const result = (await api.post<{ data: { accessToken: string; user: AuthUser; refreshToken?: string } }>("/auth/passkeys/login/verify", { ceremonyId: data.ceremonyId, response })).data.data;
  keepRefreshToken(result.refreshToken);
  return result;
}
export async function removePasskey(id: string, password: string) { await api.post("/auth/passkeys/remove", { id, password }); }
export function passkeyError(error: unknown, isAr: boolean) {
  const name = (error as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "AbortError") return isAr ? "تم إلغاء التحقق أو انتهت المهلة. جرّب مرة أخرى." : "Verification was cancelled or timed out. Try again.";
  if (name === "InvalidStateError") return isAr ? "هذا الجهاز مسجّل بالفعل. استخدم المفتاح الموجود أو جهازًا آخر." : "This device is already registered. Use its existing passkey or another device.";
  if (name === "SecurityError" || name === "NotSupportedError") return isAr ? "افتح الموقع مباشرة في متصفح يدعم مفاتيح المرور، وتأكد من تفعيل قفل الجهاز." : "Open the website directly in a browser that supports passkeys and enable device screen lock.";
  return null;
}
