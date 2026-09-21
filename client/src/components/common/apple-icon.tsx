import React from "react";
import { cn } from "@/lib/utils";

export type AppleTone =
  | "blue"
  | "indigo"
  | "purple"
  | "emerald"
  | "teal"
  | "amber"
  | "orange"
  | "rose"
  | "red"
  | "cyan"
  | "sky"
  | "zinc"
  | "slate";

export type AppleSize = "xs" | "sm" | "md" | "lg" | "xl";

const TONE_GRADIENTS: Record<AppleTone, { bg: string; shadow: string }> = {
  blue: {
    bg: "bg-gradient-to-b from-[#147EFB] via-[#0A84FF] to-[#0051D5]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(0,122,255,0.4)]",
  },
  indigo: {
    bg: "bg-gradient-to-b from-[#6366F1] via-[#5856D6] to-[#4338CA]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(99,102,241,0.4)]",
  },
  purple: {
    bg: "bg-gradient-to-b from-[#BF5AF2] via-[#AF52DE] to-[#7E22CE]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(175,82,222,0.4)]",
  },
  emerald: {
    bg: "bg-gradient-to-b from-[#34C759] via-[#10B981] to-[#059669]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(52,199,89,0.4)]",
  },
  teal: {
    bg: "bg-gradient-to-b from-[#30B0C7] via-[#14B8A6] to-[#0D9488]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(48,176,199,0.4)]",
  },
  amber: {
    bg: "bg-gradient-to-b from-[#FFB340] via-[#FF9500] to-[#D97706]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(255,149,0,0.4)]",
  },
  orange: {
    bg: "bg-gradient-to-b from-[#FF6B4A] via-[#FF5E3A] to-[#E65100]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(255,94,58,0.4)]",
  },
  rose: {
    bg: "bg-gradient-to-b from-[#FF375F] via-[#FF2D55] to-[#D81B60]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(255,45,85,0.4)]",
  },
  red: {
    bg: "bg-gradient-to-b from-[#FF453A] via-[#FF3B30] to-[#B91C1C]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(255,59,48,0.4)]",
  },
  cyan: {
    bg: "bg-gradient-to-b from-[#32ADE6] via-[#06B6D4] to-[#0284C7]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(6,182,212,0.4)]",
  },
  sky: {
    bg: "bg-gradient-to-b from-[#64D2FF] via-[#38BDF8] to-[#0284C7]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(56,189,248,0.4)]",
  },
  zinc: {
    bg: "bg-gradient-to-b from-[#8E8E93] via-[#71717A] to-[#3F3F46]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(113,113,122,0.4)]",
  },
  slate: {
    bg: "bg-gradient-to-b from-[#64748B] via-[#475569] to-[#1E293B]",
    shadow: "shadow-[0_4px_12px_-2px_rgba(71,85,105,0.4)]",
  },
};

const SIZE_STYLES: Record<AppleSize, { container: string; icon: string }> = {
  xs: {
    container: "h-6 w-6 rounded-[7px]",
    icon: "h-3.5 w-3.5",
  },
  sm: {
    container: "h-7 w-7 rounded-[8px]",
    icon: "h-4 w-4",
  },
  md: {
    container: "h-9 w-9 rounded-[10px]",
    icon: "h-5 w-5",
  },
  lg: {
    container: "h-11 w-11 rounded-[13px]",
    icon: "h-6 w-6",
  },
  xl: {
    container: "h-14 w-14 rounded-[16px]",
    icon: "h-7 w-7",
  },
};

interface AppleIconProps {
  icon: React.ComponentType<{ className?: string }>;
  tone?: AppleTone;
  size?: AppleSize;
  className?: string;
  iconClassName?: string;
}

export function AppleIcon({
  icon: Icon,
  tone = "blue",
  size = "md",
  className,
  iconClassName,
}: AppleIconProps) {
  const toneStyle = TONE_GRADIENTS[tone] ?? TONE_GRADIENTS.blue;
  const sizeStyle = SIZE_STYLES[size] ?? SIZE_STYLES.md;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border border-white/20 transition-all duration-200 select-none",
        "shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.45)]",
        toneStyle.bg,
        toneStyle.shadow,
        sizeStyle.container,
        className
      )}
    >
      {/* Specular top-half gloss reflection (Apple signature glass sheen) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />

      {/* Crisp White Centered Glyph with subtle drop shadow */}
      <Icon
        className={cn(
          "relative z-10 text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.35)] shrink-0",
          sizeStyle.icon,
          iconClassName
        )}
      />
    </div>
  );
}

