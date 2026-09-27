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
    const faceShadowId = `sa-faceshadow-${cleanId}`;
    const colors = BG_GRADIENTS[theme] || BG_GRADIENTS.obsidian;

    // Helper: Male Face with expressive eyes, visible forehead, nose, and groomed Saudi facial hair
    const renderMaleFace = (beard: "full" | "goatee" | "stubble" = "goatee", glasses = false) => (
      <g>
        {/* Neck */}
        <rect x="52" y="68" width="16" height="26" rx="3" fill="#f5c298" />
        <path d="M52,74 C56,80 64,80 68,74 L68,82 C64,86 56,86 52,82 Z" fill="#e0a37e" opacity="0.6" />

        {/* Head / Jaw Contour */}
        <path d="M41,52 C41,74 48,86 60,86 C72,86 79,74 79,52 C79,36 71,32 60,32 C49,32 41,36 41,52 Z" fill="#f8cfad" />
        <path d="M41,52 C41,74 48,86 60,86 C72,86 79,74 79,52 C79,36 71,32 60,32 C49,32 41,36 41,52 Z" fill={`url(#${faceShadowId})`} />

        {/* Ears */}
        <ellipse cx="40" cy="59" rx="3" ry="5.5" fill="#f0be95" />
        <ellipse cx="40.5" cy="59" rx="1.5" ry="3" fill="#dfa579" />
        <ellipse cx="80" cy="59" rx="3" ry="5.5" fill="#f0be95" />
        <ellipse cx="79.5" cy="59" rx="1.5" ry="3" fill="#dfa579" />

        {/* Eyebrows (Clearly visible on the forehead!) */}
        <path d="M46,49 C49,46.5 54,46.5 57,49" stroke="#1c1917" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M63,49 C66,46.5 71,46.5 74,49" stroke="#1c1917" strokeWidth="2.2" strokeLinecap="round" fill="none" />

        {/* Left Eye */}
        <ellipse cx="51.5" cy="55.5" rx="4.2" ry="2.8" fill="#ffffff" />
        <circle cx="52" cy="55.5" r="2.2" fill="#2d1d17" />
        <circle cx="52.2" cy="55.5" r="1.1" fill="#000000" />
        <circle cx="51.2" cy="54.6" r="0.75" fill="#ffffff" />
        <path d="M47,55.5 C49,53 54,53 56,55.5" stroke="#1c1917" strokeWidth="1.1" strokeLinecap="round" fill="none" />

        {/* Right Eye */}
        <ellipse cx="68.5" cy="55.5" rx="4.2" ry="2.8" fill="#ffffff" />
        <circle cx="68" cy="55.5" r="2.2" fill="#2d1d17" />
        <circle cx="67.8" cy="55.5" r="1.1" fill="#000000" />
        <circle cx="67.2" cy="54.6" r="0.75" fill="#ffffff" />
        <path d="M64,55.5 C66,53 71,53 73,55.5" stroke="#1c1917" strokeWidth="1.1" strokeLinecap="round" fill="none" />

        {/* Nose */}
        <path d="M60,51 L59,62 L56.5,65 C58,66.8 62,66.8 63.5,65 L61,62" fill="none" stroke="#d99368" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Mouth & Smile */}
        <path d="M55,73 C57.5,75.5 62.5,75.5 65,73" stroke="#b45309" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <path d="M56,73.5 C58,74.8 62,74.8 64,73.5" stroke="#df8e76" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Facial Hair */}
        {beard === "goatee" && (
          <g>
            <path d="M52,68 C55,66 59,67.5 60,69 C61,67.5 65,66 68,68 C66,70 61,70.5 60,70 C59,70.5 54,70 52,68 Z" fill="#1c1917" />
            <path d="M58,75 C59,74.5 61,74.5 62,75 C62.5,76.5 61.5,78 60,78 C58.5,78 57.5,76.5 58,75 Z" fill="#1c1917" />
            <path d="M53,81 C56,84.5 64,84.5 67,81 C65,85.5 55,85.5 53,81 Z" fill="#1c1917" />
            <path d="M43,62 C44,75 52,84 60,84 C68,84 76,75 77,62" stroke="#1c1917" strokeWidth="1.2" strokeDasharray="1.5 1.5" fill="none" opacity="0.45" />
          </g>
        )}
        {beard === "full" && (
          <g>
            <path d="M51,68 C55,66 59,67.5 60,69 C61,67.5 65,66 69,68 C67,70.5 61,71 60,70.5 C59,71 53,70.5 51,68 Z" fill="#171717" />
            <path d="M42,60 C42,76 48,87 60,87 C72,87 78,76 78,60 C76,74 69,82 60,82 C51,82 44,74 42,60 Z" fill="#171717" />
            <path d="M57,75 C58.5,74.5 61.5,74.5 63,75 C63,78 57,78 57,75 Z" fill="#171717" />
          </g>
        )}
        {beard === "stubble" && (
          <g>
            <path d="M53,69 C56,67.5 59,68.5 60,69.5 C61,68.5 64,67.5 67,69 C65,70.5 61,71 60,70.5 C59,71 55,70.5 53,69 Z" fill="#2d1d17" opacity="0.85" />
            <path d="M56,82 C58,83.5 62,83.5 64,82 C63,84.5 57,84.5 56,82 Z" fill="#2d1d17" opacity="0.85" />
          </g>
        )}

        {/* Glasses */}
        {glasses && (
          <g>
            <rect x="44" y="49" width="14" height="11" rx="2.5" fill="#38bdf8" fillOpacity="0.12" stroke="#0284c7" strokeWidth="1.4" />
            <rect x="62" y="49" width="14" height="11" rx="2.5" fill="#38bdf8" fillOpacity="0.12" stroke="#0284c7" strokeWidth="1.4" />
            <path d="M58,53 Q60,51.5 62,53" stroke="#0284c7" strokeWidth="1.4" fill="none" />
            <path d="M44,53 L40,55 M76,53 L80,55" stroke="#0284c7" strokeWidth="1.4" />
            <line x1="46" y1="58" x2="52" y2="51" stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
            <line x1="64" y1="58" x2="70" y2="51" stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
          </g>
        )}
      </g>
    );

    // Helper: Female Face with expressive eyes, eyelashes, subtle blush, and rose lips
    const renderFemaleFace = (glasses = false, niqab = false) => (
      <g>
        {/* Neck */}
        <rect x="53" y="70" width="14" height="24" rx="3" fill="#fce4cf" />

        {/* Head / Jaw Shape */}
        <path d="M42,50 C42,72 49,83 60,83 C71,83 78,72 78,50 C78,36 71,32 60,32 C49,32 42,36 42,50 Z" fill="#fdebdc" />

        {/* Eyebrows */}
        <path d="M46,48.5 C49,45.5 54,45.5 57,48" stroke="#1c1917" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M63,48 C66,45.5 71,45.5 74,48.5" stroke="#1c1917" strokeWidth="1.8" strokeLinecap="round" fill="none" />

        {/* Left Eye */}
        <ellipse cx="51.5" cy="54.5" rx="4.5" ry="3" fill="#ffffff" />
        <circle cx="52" cy="54.5" r="2.3" fill="#2d1d17" />
        <circle cx="52.2" cy="54.5" r="1.1" fill="#000000" />
        <circle cx="51" cy="53.5" r="0.85" fill="#ffffff" />
        <path d="M46.5,54.5 C48.5,51.8 54.5,51.8 56.5,54.5" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d="M56,53.5 L58,52" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />

        {/* Right Eye */}
        <ellipse cx="68.5" cy="54.5" rx="4.5" ry="3" fill="#ffffff" />
        <circle cx="68" cy="54.5" r="2.3" fill="#2d1d17" />
        <circle cx="67.8" cy="54.5" r="1.1" fill="#000000" />
        <circle cx="67" cy="53.5" r="0.85" fill="#ffffff" />
        <path d="M63.5,54.5 C65.5,51.8 71.5,51.8 73.5,54.5" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d="M73,53.5 L75,52" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />

        {/* Nose */}
        <path d="M60,50 L59.3,61 L57.5,63.5 C58.5,64.8 61.5,64.8 62.5,63.5 L60.7,61" fill="none" stroke="#e8a882" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />

        {/* Cheek Blush */}
        <ellipse cx="46" cy="61" rx="4.5" ry="2.5" fill="#f43f5e" opacity="0.16" />
        <ellipse cx="74" cy="61" rx="4.5" ry="2.5" fill="#f43f5e" opacity="0.16" />

        {/* Lips */}
        {!niqab && (
          <g>
            <path d="M54.5,71.5 C57,74.5 63,74.5 65.5,71.5" stroke="#be123c" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            <path d="M55,71.5 C57.5,70.5 62.5,70.5 65,71.5 C63,74 57,74 55,71.5 Z" fill="#e11d48" opacity="0.75" />
          </g>
        )}

        {/* Glasses */}
        {glasses && (
          <g>
            <circle cx="51.5" cy="54.5" r="7.5" fill="#38bdf8" fillOpacity="0.1" stroke="#d97706" strokeWidth="1.3" />
            <circle cx="68.5" cy="54.5" r="7.5" fill="#38bdf8" fillOpacity="0.1" stroke="#d97706" strokeWidth="1.3" />
            <path d="M59,54 Q60,52.5 61,54" stroke="#d97706" strokeWidth="1.3" fill="none" />
            <path d="M44,54 L40,55 M76,54 L80,55" stroke="#d97706" strokeWidth="1.3" />
            <line x1="48" y1="57" x2="53" y2="51" stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
            <line x1="65" y1="57" x2="70" y2="51" stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
          </g>
        )}
      </g>
    );

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

            {/* Red Shemagh Micro Pattern */}
            <pattern
              id={shemaghPatternId}
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <rect width="8" height="8" fill="#fcf9f2" />
              <path
                d="M0,0 L4,0 L4,4 L0,4 Z M4,4 L8,4 L8,8 L4,8 Z"
                fill="#b91c1c"
                opacity="0.92"
              />
              <path
                d="M0,2 L2,0 M2,4 L4,2 M4,6 L6,4 M6,8 L8,6"
                stroke="#991b1b"
                strokeWidth="0.8"
              />
              <circle cx="2" cy="6" r="0.8" fill="#7f1d1d" />
              <circle cx="6" cy="2" r="0.8" fill="#7f1d1d" />
            </pattern>

            {/* Gold Zari Embroidery Gradient */}
            <linearGradient id={zariGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Soft Face Shadow Gradient */}
            <radialGradient id={faceShadowId} cx="50%" cy="40%" r="50%">
              <stop offset="70%" stopColor="#000000" stopOpacity="0" />
              <stop offset="100%" stopColor="#78350f" stopOpacity="0.22" />
            </radialGradient>
          </defs>

          {/* Background Circle */}
          <circle cx="60" cy="60" r="58" fill={`url(#${gradId})`} />

          {/* 1. Male: Royal Red Shemagh */}
          {resolvedId === "male-shemagh-red" && (
            <g>
              <path d="M26,36 C20,55 18,85 24,106 C30,114 38,110 44,96 L76,96 C82,110 90,114 96,106 C102,85 100,55 94,36 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
              <path d="M16,120 C20,98 40,92 60,92 C80,92 100,98 104,120 Z" fill="#ffffff" />
              <path d="M48,88 L60,98 L72,88 L60,82 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
              <circle cx="60" cy="91" r="1" fill="#94a3b8" />
              <circle cx="60" cy="103" r="1.1" fill="#cbd5e1" />
              <circle cx="60" cy="111" r="1.1" fill="#cbd5e1" />
              {renderMaleFace("goatee")}
              <path d="M37,28 C37,16 48,13 60,13 C72,13 83,16 83,28 Z" fill={`url(#${shemaghPatternId})`} />
              <ellipse cx="60" cy="27" rx="24" ry="5.5" fill="none" stroke="#171717" strokeWidth="3.5" />
              <ellipse cx="60" cy="31" rx="25" ry="6" fill="none" stroke="#262626" strokeWidth="4" />
              <ellipse cx="60" cy="31" rx="25" ry="6" fill="none" stroke="#404040" strokeWidth="1.2" strokeDasharray="3 2" />
              <path d="M36,32 C42,37 52,40 59,38 C60,37 60,37 61,38 C68,40 78,37 84,32 L86,42 C82,48 76,46 72,42 C68,44 60,42 60,42 C60,42 52,44 48,42 C44,46 38,48 34,42 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
              <path d="M36,34 C35,46 32,70 27,95 C33,96 39,94 41,84 C42,66 43,46 45,38 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
              <path d="M84,34 C85,46 88,70 93,95 C87,96 81,94 79,84 C78,66 77,46 75,38 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
            </g>
          )}

          {/* 2. Male: Diplomatic White Ghutra */}
          {resolvedId === "male-ghutra-white" && (
            <g>
              <path d="M26,36 C20,55 18,85 24,106 C30,114 38,110 44,96 L76,96 C82,110 90,114 96,106 C102,85 100,55 94,36 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
              <path d="M16,120 C20,98 40,92 60,92 C80,92 100,98 104,120 Z" fill="#ffffff" />
              <path d="M48,88 L60,98 L72,88 L60,82 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
              <circle cx="60" cy="91" r="1" fill="#94a3b8" />
              {renderMaleFace("full")}
              <path d="M37,28 C37,16 48,13 60,13 C72,13 83,16 83,28 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.75" />
              <ellipse cx="60" cy="27" rx="24" ry="5.5" fill="none" stroke="#171717" strokeWidth="3.5" />
              <ellipse cx="60" cy="31" rx="25" ry="6" fill="none" stroke="#262626" strokeWidth="4" />
              <path d="M36,32 C42,37 52,39 59,37 C60,36.5 60,36.5 61,37 C68,39 78,37 84,32 L86,40 C82,45 76,44 72,40 C68,42 60,40 60,40 C60,40 52,42 48,40 C44,44 38,45 34,40 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.75" />
              <path d="M36,34 C35,46 32,70 27,95 C33,96 39,94 41,84 C42,66 43,46 45,38 Z" fill="#fcfcfc" stroke="#cbd5e1" strokeWidth="0.75" />
              <path d="M84,34 C85,46 88,70 93,95 C87,96 81,94 79,84 C78,66 77,46 75,38 Z" fill="#fcfcfc" stroke="#cbd5e1" strokeWidth="0.75" />
            </g>
          )}

          {/* 3. Male: Royal Bisht with Gold Zari */}
          {resolvedId === "male-bisht-royal" && (
            <g>
              <path d="M26,36 C20,55 18,85 24,106 C30,114 38,110 44,96 L76,96 C82,110 90,114 96,106 C102,85 100,55 94,36 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
              <path d="M14,120 C18,94 40,88 60,88 C80,88 102,94 106,120 Z" fill="#09090b" />
              <path d="M48,88 L60,102 L72,88 L60,82 Z" fill="#ffffff" />
              <path d="M45,88 L43,120 L49,120 L51,96 L60,104 L69,96 L71,120 L77,120 L75,88 Z" fill={`url(#${zariGradId})`} />
              <path d="M58,103 L60,106 L62,103" stroke="#fef08a" strokeWidth="1.5" fill="none" />
              <circle cx="60" cy="110" r="2.5" fill={`url(#${zariGradId})`} />
              <line x1="60" y1="110" x2="60" y2="120" stroke="#f59e0b" strokeWidth="1.5" />
              {renderMaleFace("full")}
              <path d="M37,28 C37,16 48,13 60,13 C72,13 83,16 83,28 Z" fill={`url(#${shemaghPatternId})`} />
              <ellipse cx="60" cy="27" rx="24" ry="5.5" fill="none" stroke="#171717" strokeWidth="3.5" />
              <ellipse cx="60" cy="31" rx="25" ry="6" fill="none" stroke="#262626" strokeWidth="4" />
              <ellipse cx="60" cy="31" rx="25" ry="6" fill="none" stroke={`url(#${zariGradId})`} strokeWidth="0.75" strokeDasharray="4 3" />
              <path d="M36,32 C42,37 52,40 59,38 C60,37 60,37 61,38 C68,40 78,37 84,32 L86,42 C82,48 76,46 72,42 C68,44 60,42 60,42 C60,42 52,44 48,42 C44,46 38,48 34,42 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
              <path d="M36,34 C35,46 32,70 27,95 C33,96 39,94 41,84 C42,66 43,46 45,38 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
              <path d="M84,34 C85,46 88,70 93,95 C87,96 81,94 79,84 C78,66 77,46 75,38 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
            </g>
          )}

          {/* 4. Male: Camel Brown Bisht */}
          {resolvedId === "male-bisht-brown" && (
            <g>
              <path d="M26,36 C20,55 18,85 24,106 C30,114 38,110 44,96 L76,96 C82,110 90,114 96,106 C102,85 100,55 94,36 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
              <path d="M14,120 C18,94 40,88 60,88 C80,88 102,94 106,120 Z" fill="#78350f" />
              <path d="M48,88 L60,102 L72,88 L60,82 Z" fill="#ffffff" />
              <path d="M45,88 L43,120 L49,120 L51,96 L60,104 L69,96 L71,120 L77,120 L75,88 Z" fill={`url(#${zariGradId})`} />
              <circle cx="60" cy="110" r="2.5" fill={`url(#${zariGradId})`} />
              <line x1="60" y1="110" x2="60" y2="120" stroke="#f59e0b" strokeWidth="1.5" />
              {renderMaleFace("goatee")}
              <path d="M37,28 C37,16 48,13 60,13 C72,13 83,16 83,28 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.75" />
              <ellipse cx="60" cy="27" rx="24" ry="5.5" fill="none" stroke="#171717" strokeWidth="3.5" />
              <ellipse cx="60" cy="31" rx="25" ry="6" fill="none" stroke="#262626" strokeWidth="4" />
              <path d="M36,32 C42,37 52,39 59,37 C60,36.5 60,36.5 61,37 C68,39 78,37 84,32 L86,40 C82,45 76,44 72,40 C68,42 60,40 60,40 C60,40 52,42 48,40 C44,44 38,45 34,40 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.75" />
              <path d="M36,34 C35,46 32,70 27,95 C33,96 39,94 41,84 C42,66 43,46 45,38 Z" fill="#fcfcfc" stroke="#cbd5e1" strokeWidth="0.75" />
              <path d="M84,34 C85,46 88,70 93,95 C87,96 81,94 79,84 C78,66 77,46 75,38 Z" fill="#fcfcfc" stroke="#cbd5e1" strokeWidth="0.75" />
            </g>
          )}

          {/* 5. Male: Tech Glasses & Shemagh */}
          {resolvedId === "male-shemagh-glasses" && (
            <g>
              <path d="M26,36 C20,55 18,85 24,106 C30,114 38,110 44,96 L76,96 C82,110 90,114 96,106 C102,85 100,55 94,36 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
              <path d="M16,120 C20,98 40,92 60,92 C80,92 100,98 104,120 Z" fill="#ffffff" />
              <path d="M16,120 C20,98 34,94 44,94 L46,120 Z" fill="#0f172a" />
              <path d="M104,120 C100,98 86,94 76,94 L74,120 Z" fill="#0f172a" />
              <path d="M48,88 L60,98 L72,88 L60,82 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
              {renderMaleFace("goatee", true)}
              <path d="M37,28 C37,16 48,13 60,13 C72,13 83,16 83,28 Z" fill={`url(#${shemaghPatternId})`} />
              <ellipse cx="60" cy="27" rx="24" ry="5.5" fill="none" stroke="#171717" strokeWidth="3.5" />
              <ellipse cx="60" cy="31" rx="25" ry="6" fill="none" stroke="#262626" strokeWidth="4" />
              <path d="M36,32 C42,37 52,40 59,38 C60,37 60,37 61,38 C68,40 78,37 84,32 L86,42 C82,48 76,46 72,42 C68,44 60,42 60,42 C60,42 52,44 48,42 C44,46 38,48 34,42 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
              <path d="M36,34 C35,46 32,70 27,95 C33,96 39,94 41,84 C42,66 43,46 45,38 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
              <path d="M84,34 C85,46 88,70 93,95 C87,96 81,94 79,84 C78,66 77,46 75,38 Z" fill={`url(#${shemaghPatternId})`} stroke="#b91c1c" strokeWidth="0.5" />
            </g>
          )}

          {/* 6. Male: Young Professional Ghutra */}
          {resolvedId === "male-ghutra-young" && (
            <g>
              <path d="M26,36 C20,55 18,85 24,106 C30,114 38,110 44,96 L76,96 C82,110 90,114 96,106 C102,85 100,55 94,36 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
              <path d="M16,120 C20,98 40,92 60,92 C80,92 100,98 104,120 Z" fill="#ffffff" />
              <path d="M16,120 C20,98 34,94 44,94 L46,120 Z" fill="#334155" />
              <path d="M104,120 C100,98 86,94 76,94 L74,120 Z" fill="#334155" />
              <path d="M48,88 L60,98 L72,88 L60,82 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
              {renderMaleFace("stubble")}
              <path d="M37,28 C37,16 48,13 60,13 C72,13 83,16 83,28 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.75" />
              <ellipse cx="60" cy="27" rx="24" ry="5.5" fill="none" stroke="#171717" strokeWidth="3.5" />
              <ellipse cx="60" cy="31" rx="25" ry="6" fill="none" stroke="#262626" strokeWidth="4" />
              <path d="M36,32 C44,36 53,38 59,35 C60,34.5 60,34.5 61,35 C67,38 76,36 84,32 L86,40 C81,44 75,42 71,38 C67,40 60,38 60,38 C60,38 53,40 49,38 C45,42 39,44 34,40 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.75" />
              <path d="M36,34 C35,46 32,70 27,95 C33,96 39,94 41,84 C42,66 43,46 45,38 Z" fill="#fcfcfc" stroke="#cbd5e1" strokeWidth="0.75" />
              <path d="M84,34 C85,46 88,70 93,95 C87,96 81,94 79,84 C78,66 77,46 75,38 Z" fill="#fcfcfc" stroke="#cbd5e1" strokeWidth="0.75" />
            </g>
          )}

          {/* 7. Female: Executive Black Hijab & Abaya */}
          {resolvedId === "female-hijab-black" && (
            <g>
              <path d="M22,45 C20,70 22,95 24,120 L96,120 C98,95 100,70 98,45 C98,22 80,14 60,14 C40,14 22,22 22,45 Z" fill="#09090b" />
              <path d="M16,120 C20,96 40,92 60,92 C80,92 100,96 104,120 Z" fill="#18181b" />
              <path d="M50,96 L60,108 L70,96 L60,92 Z" fill="#09090b" stroke={`url(#${zariGradId})`} strokeWidth="1.2" />
              {renderFemaleFace(false)}
              <path d="M43,44 C48,40 55,39 60,39 C65,39 72,40 77,44 C76,41 69,38 60,38 C51,38 44,41 43,44 Z" fill="#27272a" />
              <path
                d="M26,45 C26,24 41,18 60,18 C79,18 94,24 94,45 C94,72 88,96 80,106 C72,114 48,114 40,106 C32,96 26,72 26,45 Z
                   M42,50 C42,73 49,84 60,84 C71,84 78,73 78,50 C78,39 71,37 60,37 C49,37 42,39 42,50 Z"
                fill="#09090b"
                fillRule="evenodd"
              />
              <path d="M40,92 C46,99 54,103 60,103 C66,103 74,99 80,92" stroke="#27272a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>
          )}

          {/* 8. Female: Emerald Corporate Hijab */}
          {resolvedId === "female-hijab-emerald" && (
            <g>
              <path d="M22,45 C20,70 22,95 24,120 L96,120 C98,95 100,70 98,45 C98,22 80,14 60,14 C40,14 22,22 22,45 Z" fill="#064e3b" />
              <path d="M16,120 C20,96 40,92 60,92 C80,92 100,96 104,120 Z" fill="#0f172a" />
              <path d="M48,96 L60,110 L72,96 L60,92 Z" fill="#ffffff" />
              <path d="M46,94 L58,120 L62,120 L74,94" stroke="#047857" strokeWidth="1.5" fill="none" />
              {renderFemaleFace(false)}
              <path d="M43,44 C48,40 55,39 60,39 C65,39 72,40 77,44 C76,41 69,38 60,38 C51,38 44,41 43,44 Z" fill="#fef3c7" />
              <path
                d="M26,45 C26,24 41,18 60,18 C79,18 94,24 94,45 C94,72 88,96 80,106 C72,114 48,114 40,106 C32,96 26,72 26,45 Z
                   M42,50 C42,73 49,84 60,84 C71,84 78,73 78,50 C78,39 71,37 60,37 C49,37 42,39 42,50 Z"
                fill="#047857"
                fillRule="evenodd"
              />
              <path d="M40,92 C46,99 54,103 60,103 C66,103 74,99 80,92" stroke="#065f46" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>
          )}

          {/* 9. Female: Dusty Rose Modern Hijab */}
          {resolvedId === "female-hijab-rosegold" && (
            <g>
              <path d="M22,45 C20,70 22,95 24,120 L96,120 C98,95 100,70 98,45 C98,22 80,14 60,14 C40,14 22,22 22,45 Z" fill="#9d174d" />
              <path d="M16,120 C20,96 40,92 60,92 C80,92 100,96 104,120 Z" fill="#fdfbf7" />
              <path d="M48,96 L60,110 L72,96 L60,92 Z" fill="#fbcfe8" />
              <path d="M46,94 L58,120 L62,120 L74,94" stroke="#db2777" strokeWidth="1.2" fill="none" />
              {renderFemaleFace(false)}
              <path d="M43,44 C48,40 55,39 60,39 C65,39 72,40 77,44 C76,41 69,38 60,38 C51,38 44,41 43,44 Z" fill="#fce7f3" />
              <path
                d="M26,45 C26,24 41,18 60,18 C79,18 94,24 94,45 C94,72 88,96 80,106 C72,114 48,114 40,106 C32,96 26,72 26,45 Z
                   M42,50 C42,73 49,84 60,84 C71,84 78,73 78,50 C78,39 71,37 60,37 C49,37 42,39 42,50 Z"
                fill="#be185d"
                fillRule="evenodd"
              />
              <path d="M40,92 C46,99 54,103 60,103 C66,103 74,99 80,92" stroke="#9d174d" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>
          )}

          {/* 10. Female: Modest Saudi Niqab */}
          {resolvedId === "female-niqab-modest" && (
            <g>
              <path d="M22,45 C20,70 22,95 24,120 L96,120 C98,95 100,70 98,45 C98,22 80,14 60,14 C40,14 22,22 22,45 Z" fill="#09090b" />
              <path d="M16,120 C20,96 40,92 60,92 C80,92 100,96 104,120 Z" fill="#18181b" />
              {renderFemaleFace(false, true)}
              <path d="M38,36 C44,34 52,33 60,33 C68,33 76,34 82,36 L83,44 C76,43 68,42 60,42 C52,42 44,43 37,44 Z" fill="#18181b" stroke="#09090b" strokeWidth="0.8" />
              <line x1="38" y1="36" x2="82" y2="36" stroke={`url(#${zariGradId})`} strokeWidth="0.8" />
              <path d="M38,62 C48,60 72,60 82,62 L84,105 C76,112 44,112 36,105 Z" fill="#09090b" stroke="#27272a" strokeWidth="1" />
              <line x1="60" y1="62" x2="60" y2="108" stroke="#18181b" strokeWidth="1.5" />
              <path d="M38,62 C48,60.5 72,60.5 82,62" stroke={`url(#${zariGradId})`} strokeWidth="1.2" strokeLinecap="round" fill="none" />
            </g>
          )}

          {/* 11. Female: Consultant Glasses & Hijab */}
          {resolvedId === "female-hijab-glasses" && (
            <g>
              <path d="M22,45 C20,70 22,95 24,120 L96,120 C98,95 100,70 98,45 C98,22 80,14 60,14 C40,14 22,22 22,45 Z" fill="#0f172a" />
              <path d="M16,120 C20,96 40,92 60,92 C80,92 100,96 104,120 Z" fill="#1e293b" />
              <path d="M48,96 L60,110 L72,96 L60,92 Z" fill="#ffffff" />
              <path d="M46,94 L58,120 L62,120 L74,94" stroke="#0284c7" strokeWidth="1.2" fill="none" />
              {renderFemaleFace(true)}
              <path d="M43,44 C48,40 55,39 60,39 C65,39 72,40 77,44 C76,41 69,38 60,38 C51,38 44,41 43,44 Z" fill="#f8fafc" />
              <path
                d="M26,45 C26,24 41,18 60,18 C79,18 94,24 94,45 C94,72 88,96 80,106 C72,114 48,114 40,106 C32,96 26,72 26,45 Z
                   M42,50 C42,73 49,84 60,84 C71,84 78,73 78,50 C78,39 71,37 60,37 C49,37 42,39 42,50 Z"
                fill="#1e3a8a"
                fillRule="evenodd"
              />
              <path d="M40,92 C46,99 54,103 60,103 C66,103 74,99 80,92" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>
          )}

          {/* 12. Female: Royal Sapphire Hijab */}
          {resolvedId === "female-hijab-sapphire" && (
            <g>
              <path d="M22,45 C20,70 22,95 24,120 L96,120 C98,95 100,70 98,45 C98,22 80,14 60,14 C40,14 22,22 22,45 Z" fill="#172554" />
              <path d="M16,120 C20,96 40,92 60,92 C80,92 100,96 104,120 Z" fill="#09090b" />
              <path d="M50,96 L60,108 L70,96 L60,92 Z" fill="#172554" stroke={`url(#${zariGradId})`} strokeWidth="1.2" />
              {renderFemaleFace(false)}
              <path d="M43,44 C48,40 55,39 60,39 C65,39 72,40 77,44 C76,41 69,38 60,38 C51,38 44,41 43,44 Z" fill="#fef3c7" />
              <path
                d="M26,45 C26,24 41,18 60,18 C79,18 94,24 94,45 C94,72 88,96 80,106 C72,114 48,114 40,106 C32,96 26,72 26,45 Z
                   M42,50 C42,73 49,84 60,84 C71,84 78,73 78,50 C78,39 71,37 60,37 C49,37 42,39 42,50 Z"
                fill="#1d4ed8"
                fillRule="evenodd"
              />
              <path d="M40,92 C46,99 54,103 60,103 C66,103 74,99 80,92" stroke="#1e3a8a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>
          )}
        </svg>
      </div>
    );
  }
);

SaudiAvatar.displayName = "SaudiAvatar";
