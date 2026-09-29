import { useEffect, useState, type CSSProperties } from "react";
import { filesApi } from "@/api/files";
import { SaudiAvatar } from "@/components/avatars/saudi-avatar";
import { cn } from "@/lib/utils";

/* A person's avatar everywhere in SanaD: their uploaded photo, else the
   ready-made avatar they picked, else their initials on a colour made from
   their name (the same name always gets the same colour). */

const TONES: [string, string][] = [
  ["#0a84c6", "#5b5bd6"],
  ["#5b5bd6", "#8b5cf6"],
  ["#0e9f8e", "#0a84c6"],
  ["#c97a06", "#e0475b"],
  ["#e0475b", "#8b5cf6"],
  ["#1f9d5b", "#0e9f8e"],
  ["#8b5cf6", "#e0475b"],
];

export function initialsOf(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  const first = parts[0].charAt(0);
  const second = parts.length > 1 ? parts[1].charAt(0) : "";
  return (first + second).toUpperCase();
}

function toneOf(name?: string | null) {
  let h = 0;
  for (const ch of name ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export interface UserAvatarProps {
  name?: string | null;
  fileId?: string | null;
  avatarKey?: string | null;
  /** Width and height in px. */
  size?: number;
  className?: string;
  /** A soft coloured ring, for the current user. */
  ring?: boolean;
  /** A photo picked but not saved yet (object URL). */
  previewUrl?: string | null;
}

export function UserAvatar({ name, fileId, avatarKey, size = 38, className, ring, previewUrl }: UserAvatarProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setPhoto(null);
    if (fileId && !previewUrl) {
      filesApi
        .fetchDataUrl(fileId)
        .then((u) => live && setPhoto(u))
        .catch(() => undefined);
    }
    return () => {
      live = false;
    };
  }, [fileId, previewUrl]);

  const [c1, c2] = toneOf(name);
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.max(10, Math.round(size * 0.36)),
    boxShadow: ring ? `0 0 0 2px var(--l-surface, #fff), 0 0 0 4px ${c1}55` : undefined,
  };
  const src = previewUrl || photo;

  return (
    <span className={cn("lu-uav", className)} style={style} aria-hidden="true">
      {src ? (
        <img src={src} alt="" />
      ) : avatarKey ? (
        <SaudiAvatar avatarId={avatarKey} className="!h-full !w-full" />
      ) : (
        <span className="ini" style={{ background: `linear-gradient(145deg, ${c1}, ${c2})` }}>
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
