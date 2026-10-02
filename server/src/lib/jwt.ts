import jwt from "jsonwebtoken";
import { env } from "@/config/env";

export interface AccessTokenPayload {
  sub: string; // userId
  sid: string; // revocable database session
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: "HS256",
    issuer: "sanad-hr",
    audience: "sanad-client",
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"], issuer: "sanad-hr", audience: "sanad-client" });
  if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.sid !== "string") throw new Error("Invalid token claims");
  return payload as AccessTokenPayload;
}
