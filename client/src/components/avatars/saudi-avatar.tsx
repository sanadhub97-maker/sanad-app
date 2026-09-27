import React, { useId } from "react";
import { cn } from "@/lib/utils";
import { resolveAvatarId } from "./saudi-avatars-data";

export interface SaudiAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  avatarId?: string | null;
  gender?: "MALE" | "FEMALE" | null;
  theme?: "obsidian" | "emerald" | "gold" | "sapphire" | "light";
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showRing?: boolean;
}

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
  "2xl": "h-28 w-28 text-2xl",
};

const BG_GRADIENTS: Record<string, [string, string, string]> = {
  obsidian: ["#1e293b", "#0f172a", "#020617"],
  emerald: ["#065f46", "#047857", "#022c22"],
  gold: ["#b45309", "#78350f", "#451a03"],
  sapphire: ["#1e40af", "#1e3a8a", "#172554"],
  light: ["#f1f5f9", "#e2e8f0", "#cbd5e1"],
};

export const SaudiAvatar = React.forwardRef<HTMLDivElement, SaudiAvatarProps>(
  (
    {
      avatarId,
      gender,
      theme = "obsidian",
      size = "md",
      className,
      showRing = false,
      ...props
    },
    ref
  ) => {
    const rawId = useId();
    const cleanId = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
    const resolvedId = resolveAvatarId(avatarId, gender);
    const gradId = `sa-grad-${resolvedId}-${cleanId}`;
    const shemaghPatternId = `sa-shemagh-${cleanId}`;
    const zariGradId = `sa-zari-${cleanId}`;
    const colors = BG_GRADIENTS[theme] || BG_GRADIENTS.obsidian;

    return (
      <div
        ref={ref}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full select-none",
          SIZE_CLASSES[size] || "h-10 w-10",
          showRing && "ring-2 ring-emerald-500/30 shadow-md",
          className
        )}
        {...props}
      >
        <svg
          viewBox="0 0 120 120"
          className="h-full w-full object-cover"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Dynamic Background Gradient */}
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors[0]} />
              <stop offset="50%" stopColor={colors[1]} />
              <stop offset="100%" stopColor={colors[2]} />
            </linearGradient>

            {/* Red Shemagh Pattern */}
            <pattern
              id={shemaghPatternId}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
            >
              <rect width="6" height="6" fill="#fdfbf7" />
              <path
                d="M0,0 L3,0 L3,3 L0,3 Z M3,3 L6,3 L6,6 L3,6 Z"
                fill="#b91c1c"
                opacity="0.88"
              />
              <path
                d="M0,3 L3,6 M3,0 L6,3"
                stroke="#991b1b"
                strokeWidth="0.75"
              />
            </pattern>

            {/* Gold Zari Embroidery Gradient */}
            <linearGradient id={zariGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>

          {/* Background Circle */}
          <circle cx="60" cy="60" r="58" fill={`url(#${gradId})`} />

          {/* Avatar Graphic according to resolvedId */}
          {resolvedId === "male-shemagh-red" && (
            <g>
              <path d="M22,110 Q60,95 98,110 L104,120 L16,120 Z" fill="#ffffff" />
              <path d="M50,92 L60,102 L70,92 L60,86 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.75" />
              <rect x="52" y="70" width="16" height="20" rx="3" fill="#f5c298" />
              <ellipse cx="60" cy="62" rx="20" ry="22" fill="#f5c298" />
              <ellipse cx="39" cy="62" rx="3" ry="5" fill="#e09d67" />
              <ellipse cx="81" cy="62" rx="3" ry="5" fill="#e09d67" />
              <path d="M46,65 Q60,78 74,65 Q74,78 60,83 Q46,78 46,65 Z" fill="#2d1d17" opacity="0.9" />
              <path d="M52,66 Q60,63 68,66 Q60,68 52,66 Z" fill="#2d1d17" />
              <ellipse cx="52" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <ellipse cx="68" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <path d="M48,51 Q53,49 57,51" stroke="#2d1d17" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M63,51 Q67,49 72,51" stroke="#2d1d17" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M30,34 C30,22 42,16 60,16 C78,16 90,22 90,34 C94,48 95,78 92,98 C88,102 78,82 76,68 C76,68 70,64 60,64 C50,64 44,68 44,68 C42,82 32,102 28,98 C25,78 26,48 30,34 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
              <ellipse cx="60" cy="30" rx="24" ry="7" fill="none" stroke="#1c1917" strokeWidth="4.5" />
              <ellipse cx="60" cy="30" rx="24" ry="7" fill="none" stroke="#44403c" strokeWidth="1.2" strokeDasharray="3 2" />
              <ellipse cx="60" cy="27" rx="23" ry="6" fill="none" stroke="#0c0a09" strokeWidth="3" />
            </g>
          )}

          {resolvedId === "male-ghutra-white" && (
            <g>
              <path d="M22,110 Q60,95 98,110 L104,120 L16,120 Z" fill="#ffffff" />
              <path d="M50,92 L60,102 L70,92 L60,86 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.75" />
              <rect x="52" y="70" width="16" height="20" rx="3" fill="#f5c298" />
              <ellipse cx="60" cy="62" rx="20" ry="22" fill="#f5c298" />
              <path d="M46,65 Q60,78 74,65 Q74,78 60,83 Q46,78 46,65 Z" fill="#3f2e24" opacity="0.85" />
              <path d="M53,67 Q60,65 67,67" stroke="#3f2e24" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <ellipse cx="52" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <ellipse cx="68" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <path d="M48,51 Q53,49 57,51" stroke="#292524" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M63,51 Q67,49 72,51" stroke="#292524" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M30,34 C30,22 42,16 60,16 C78,16 90,22 90,34 C94,48 95,78 92,98 C88,102 78,82 76,68 C76,68 70,64 60,64 C50,64 44,68 44,68 C42,82 32,102 28,98 C25,78 26,48 30,34 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.2" />
              <path d="M44,68 Q36,82 32,96" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M76,68 Q84,82 88,96" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <ellipse cx="60" cy="30" rx="24" ry="7" fill="none" stroke="#171717" strokeWidth="4.5" />
              <ellipse cx="60" cy="27" rx="23" ry="6" fill="none" stroke="#262626" strokeWidth="3" />
            </g>
          )}

          {resolvedId === "male-bisht-royal" && (
            <g>
              <path d="M18,110 Q60,90 102,110 L108,120 L12,120 Z" fill="#0f0f14" />
              <path d="M42,95 L60,115 L78,95 Z" fill="#ffffff" />
              <path d="M38,98 L56,120 L64,120 L82,98 L76,96 L60,114 L44,96 Z" fill={`url(#${zariGradId})`} stroke="#d97706" strokeWidth="0.5" />
              <rect x="52" y="70" width="16" height="20" rx="3" fill="#f5c298" />
              <ellipse cx="60" cy="62" rx="20" ry="22" fill="#f5c298" />
              <path d="M46,65 Q60,78 74,65 Q74,78 60,83 Q46,78 46,65 Z" fill="#2d1d17" opacity="0.9" />
              <ellipse cx="52" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <ellipse cx="68" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <path d="M48,51 Q53,49 57,51" stroke="#2d1d17" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M63,51 Q67,49 72,51" stroke="#2d1d17" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M30,34 C30,22 42,16 60,16 C78,16 90,22 90,34 C94,48 95,78 92,98 C88,102 78,82 76,68 C76,68 70,64 60,64 C50,64 44,68 44,68 C42,82 32,102 28,98 C25,78 26,48 30,34 Z" fill={`url(#${shemaghPatternId})`} />
              <ellipse cx="60" cy="30" rx="24" ry="7" fill="none" stroke="#171717" strokeWidth="4.5" />
              <ellipse cx="60" cy="30" rx="24" ry="7" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2 3" />
              <ellipse cx="60" cy="27" rx="23" ry="6" fill="none" stroke="#262626" strokeWidth="3" />
            </g>
          )}

          {resolvedId === "male-bisht-brown" && (
            <g>
              <path d="M18,110 Q60,90 102,110 L108,120 L12,120 Z" fill="#451a03" />
              <path d="M38,98 L56,120 L64,120 L82,98 L76,96 L60,114 L44,96 Z" fill={`url(#${zariGradId})`} />
              <rect x="52" y="70" width="16" height="20" rx="3" fill="#f5c298" />
              <ellipse cx="60" cy="62" rx="20" ry="22" fill="#f5c298" />
              <path d="M50,68 Q60,78 70,68 Q70,78 60,83 Q50,78 50,68 Z" fill="#2d1d17" opacity="0.9" />
              <ellipse cx="52" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <ellipse cx="68" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <path d="M48,51 Q53,49 57,51" stroke="#2d1d17" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M63,51 Q67,49 72,51" stroke="#2d1d17" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M30,34 C30,22 42,16 60,16 C78,16 90,22 90,34 C94,48 95,78 92,98 C88,102 78,82 76,68 C76,68 70,64 60,64 C50,64 44,68 44,68 C42,82 32,102 28,98 C25,78 26,48 30,34 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.2" />
              <ellipse cx="60" cy="30" rx="24" ry="7" fill="none" stroke="#171717" strokeWidth="4.5" />
              <ellipse cx="60" cy="27" rx="23" ry="6" fill="none" stroke="#262626" strokeWidth="3" />
            </g>
          )}

          {resolvedId === "male-shemagh-glasses" && (
            <g>
              <path d="M22,110 Q60,95 98,110 L104,120 L16,120 Z" fill="#ffffff" />
              <path d="M50,92 L60,102 L70,92 L60,86 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.75" />
              <rect x="52" y="70" width="16" height="20" rx="3" fill="#f5c298" />
              <ellipse cx="60" cy="62" rx="20" ry="22" fill="#f5c298" />
              <path d="M46,65 Q60,78 74,65 Q74,78 60,83 Q46,78 46,65 Z" fill="#2d1d17" opacity="0.88" />
              <rect x="44" y="52" width="13" height="9" rx="2.5" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
              <rect x="63" y="52" width="13" height="9" rx="2.5" fill="none" stroke="#0ea5e9" strokeWidth="1.5" />
              <line x1="57" y1="56" x2="63" y2="56" stroke="#0ea5e9" strokeWidth="1.5" />
              <circle cx="50.5" cy="56.5" r="2.2" fill="#1c1917" />
              <circle cx="69.5" cy="56.5" r="2.2" fill="#1c1917" />
              <path d="M46,49 Q51,47 56,49" stroke="#2d1d17" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M64,49 Q69,47 74,49" stroke="#2d1d17" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M30,34 C30,22 42,16 60,16 C78,16 90,22 90,34 C94,48 95,78 92,98 C88,102 78,82 76,68 C76,68 70,64 60,64 C50,64 44,68 44,68 C42,82 32,102 28,98 C25,78 26,48 30,34 Z" fill={`url(#${shemaghPatternId})`} />
              <ellipse cx="60" cy="30" rx="24" ry="7" fill="none" stroke="#171717" strokeWidth="4.5" />
              <ellipse cx="60" cy="27" rx="23" ry="6" fill="none" stroke="#262626" strokeWidth="3" />
            </g>
          )}

          {resolvedId === "male-ghutra-young" && (
            <g>
              <path d="M22,110 Q60,95 98,110 L104,120 L16,120 Z" fill="#ffffff" />
              <path d="M50,92 L60,102 L70,92 L60,86 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.75" />
              <rect x="52" y="70" width="16" height="20" rx="3" fill="#ffdfba" />
              <ellipse cx="60" cy="62" rx="19" ry="21" fill="#ffdfba" />
              <path d="M54,72 Q60,76 66,72" stroke="#44403c" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <ellipse cx="52" cy="57" rx="2.5" ry="3" fill="#1c1917" />
              <ellipse cx="68" cy="57" rx="2.5" ry="3" fill="#1c1917" />
              <path d="M48,51 Q53,49 57,51" stroke="#292524" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M63,51 Q67,49 72,51" stroke="#292524" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M30,34 C30,22 42,16 60,16 C78,16 90,22 90,34 C94,48 95,78 92,98 C88,102 78,82 76,68 C76,68 70,64 60,64 C50,64 44,68 44,68 C42,82 32,102 28,98 C25,78 26,48 30,34 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.2" />
              <ellipse cx="60" cy="30" rx="24" ry="7" fill="none" stroke="#171717" strokeWidth="4.5" />
              <ellipse cx="60" cy="27" rx="23" ry="6" fill="none" stroke="#262626" strokeWidth="3" />
            </g>
          )}

          {/* 🧕 Female Avatars */}
          {resolvedId === "female-hijab-black" && (
            <g>
              <path d="M20,110 Q60,95 100,110 L106,120 L14,120 Z" fill="#171717" />
              <path d="M52,94 L60,104 L68,94" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M48,74 Q60,86 72,74 L72,94 Q60,98 48,94 Z" fill="#0f0f12" />
              <ellipse cx="60" cy="60" rx="17" ry="19" fill="#ffdfba" />
              <ellipse cx="53" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <ellipse cx="67" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <path d="M49,50 Q53,47 57,49" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M63,49 Q67,47 71,50" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M55,67 Q60,71 65,67" stroke="#b91c1c" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <path d="M35,36 C35,20 45,14 60,14 C75,14 85,20 85,36 C87,54 86,76 80,94 C76,82 72,72 72,66 C72,66 68,54 60,54 C52,54 48,66 48,66 C48,72 44,82 40,94 C34,76 33,54 35,36 Z" fill="#0f0f12" stroke="#262626" strokeWidth="1" />
              <path d="M43,44 Q60,36 77,44 Q60,33 43,44 Z" fill="#1e293b" />
            </g>
          )}

          {resolvedId === "female-hijab-emerald" && (
            <g>
              <path d="M20,110 Q60,95 100,110 L106,120 L14,120 Z" fill="#0f172a" />
              <path d="M48,74 Q60,86 72,74 L72,94 Q60,98 48,94 Z" fill="#064e3b" />
              <ellipse cx="60" cy="60" rx="17" ry="19" fill="#ffdfba" />
              <ellipse cx="53" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <ellipse cx="67" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <path d="M49,50 Q53,47 57,49" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M63,49 Q67,47 71,50" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M55,67 Q60,71 65,67" stroke="#991b1b" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <path d="M35,36 C35,20 45,14 60,14 C75,14 85,20 85,36 C87,54 86,76 80,94 C76,82 72,72 72,66 C72,66 68,54 60,54 C52,54 48,66 48,66 C48,72 44,82 40,94 C34,76 33,54 35,36 Z" fill="#047857" stroke="#065f46" strokeWidth="1.2" />
              <path d="M43,44 Q60,36 77,44 Q60,33 43,44 Z" fill="#022c22" />
            </g>
          )}

          {resolvedId === "female-hijab-rosegold" && (
            <g>
              <path d="M20,110 Q60,95 100,110 L106,120 L14,120 Z" fill="#1e1e24" />
              <path d="M48,74 Q60,86 72,74 L72,94 Q60,98 48,94 Z" fill="#9d174d" />
              <ellipse cx="60" cy="60" rx="17" ry="19" fill="#ffdfba" />
              <ellipse cx="53" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <ellipse cx="67" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <path d="M49,50 Q53,47 57,49" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M63,49 Q67,47 71,50" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M55,67 Q60,71 65,67" stroke="#be185d" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <path d="M35,36 C35,20 45,14 60,14 C75,14 85,20 85,36 C87,54 86,76 80,94 C76,82 72,72 72,66 C72,66 68,54 60,54 C52,54 48,66 48,66 C48,72 44,82 40,94 C34,76 33,54 35,36 Z" fill="#be185d" stroke="#9d174d" strokeWidth="1" />
              <path d="M43,44 Q60,36 77,44 Q60,33 43,44 Z" fill="#701a75" />
            </g>
          )}

          {resolvedId === "female-niqab-modest" && (
            <g>
              <path d="M20,110 Q60,95 100,110 L106,120 L14,120 Z" fill="#171717" />
              <ellipse cx="60" cy="60" rx="17" ry="19" fill="#ffdfba" />
              <ellipse cx="53" cy="56" rx="2.7" ry="3.2" fill="#1c1917" />
              <ellipse cx="67" cy="56" rx="2.7" ry="3.2" fill="#1c1917" />
              <circle cx="54" cy="55" r="0.8" fill="#ffffff" />
              <circle cx="68" cy="55" r="0.8" fill="#ffffff" />
              <path d="M49,50 Q53,47 57,49" stroke="#1c1917" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M63,49 Q67,47 71,50" stroke="#1c1917" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M43,62 Q60,60 77,62 L79,95 Q60,98 41,95 Z" fill="#0f0f12" stroke="#262626" strokeWidth="1" />
              <path d="M35,36 C35,20 45,14 60,14 C75,14 85,20 85,36 C87,54 86,76 80,94 C76,82 72,72 72,66 C72,66 68,54 60,54 C52,54 48,66 48,66 C48,72 44,82 40,94 C34,76 33,54 35,36 Z" fill="#0c0a09" stroke="#1c1917" strokeWidth="1.2" />
              <path d="M42,46 Q60,42 78,46 L78,50 Q60,46 42,50 Z" fill="#1c1917" />
            </g>
          )}

          {resolvedId === "female-hijab-glasses" && (
            <g>
              <path d="M20,110 Q60,95 100,110 L106,120 L14,120 Z" fill="#1e293b" />
              <path d="M48,74 Q60,86 72,74 L72,94 Q60,98 48,94 Z" fill="#0f172a" />
              <ellipse cx="60" cy="60" rx="17" ry="19" fill="#ffdfba" />
              <circle cx="53" cy="56" r="5.5" fill="none" stroke="#f59e0b" strokeWidth="1.2" />
              <circle cx="67" cy="56" r="5.5" fill="none" stroke="#f59e0b" strokeWidth="1.2" />
              <line x1="58.5" y1="56" x2="61.5" y2="56" stroke="#f59e0b" strokeWidth="1.2" />
              <circle cx="53" cy="56" r="2.2" fill="#1c1917" />
              <circle cx="67" cy="56" r="2.2" fill="#1c1917" />
              <path d="M49,49 Q53,47 57,49" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M63,49 Q67,47 71,50" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M55,67 Q60,70 65,67" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M35,36 C35,20 45,14 60,14 C75,14 85,20 85,36 C87,54 86,76 80,94 C76,82 72,72 72,66 C72,66 68,54 60,54 C52,54 48,66 48,66 C48,72 44,82 40,94 C34,76 33,54 35,36 Z" fill="#1e1b4b" stroke="#312e81" strokeWidth="1" />
              <path d="M43,44 Q60,36 77,44 Q60,33 43,44 Z" fill="#312e81" />
            </g>
          )}

          {resolvedId === "female-hijab-sapphire" && (
            <g>
              <path d="M20,110 Q60,95 100,110 L106,120 L14,120 Z" fill="#0f172a" />
              <path d="M48,74 Q60,86 72,74 L72,94 Q60,98 48,94 Z" fill="#1e3a8a" />
              <ellipse cx="60" cy="60" rx="17" ry="19" fill="#ffdfba" />
              <ellipse cx="53" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <ellipse cx="67" cy="56" rx="2.5" ry="3" fill="#1c1917" />
              <path d="M49,50 Q53,47 57,49" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M63,49 Q67,47 71,50" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M55,67 Q60,71 65,67" stroke="#b91c1c" strokeWidth="1.6" strokeLinecap="round" fill="none" />
              <path d="M35,36 C35,20 45,14 60,14 C75,14 85,20 85,36 C87,54 86,76 80,94 C76,82 72,72 72,66 C72,66 68,54 60,54 C52,54 48,66 48,66 C48,72 44,82 40,94 C34,76 33,54 35,36 Z" fill="#1e3a8a" stroke="#1d4ed8" strokeWidth="1" />
              <path d="M43,44 Q60,36 77,44 Q60,33 43,44 Z" fill="#172554" />
            </g>
          )}
        </svg>
      </div>
    );
  }
);

SaudiAvatar.displayName = "SaudiAvatar";
