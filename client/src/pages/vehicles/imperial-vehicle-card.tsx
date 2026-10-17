import { useEffect, useRef } from "react";
import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { tr } from "@/i18n";
import type { Vehicle } from "@/api/vehicles";

const AR_TO_EN_LETTERS: Record<string, string> = {
  أ: "A",
  ا: "A",
  ب: "B",
  ح: "J",
  ج: "J",
  د: "D",
  ر: "R",
  س: "S",
  ص: "X",
  ط: "T",
  ع: "E",
  ق: "G",
  ك: "K",
  ل: "L",
  م: "Z",
  ن: "N",
  ه: "H",
  هـ: "H",
  و: "U",
  ى: "V",
  ي: "V",
};

function toArabicDigits(s: string) {
  return s.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d] ?? d);
}

function toEnglishDigits(s: string) {
  return s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function toEnglishPlateLetters(plateLetters: string) {
  const chars = plateLetters
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((ch) => AR_TO_EN_LETTERS[ch] || ch.toUpperCase());
  return chars.join(" ") || plateLetters;
}

export function detectCarModel(makeStr: string | null | undefined) {
  const m = (makeStr || "").trim().toLowerCase();

  if (
    m.includes("بكب") ||
    m.includes("بيك") ||
    m.includes("غمار") ||
    m.includes("ايسوزو") ||
    m.includes("إيسوزو") ||
    m.includes("هايلوكس") ||
    m.includes("هايلكس") ||
    m.includes("شاص") ||
    m.includes("ددسن") ||
    m.includes("pickup") ||
    m.includes("hilux") ||
    m.includes("d-max") ||
    m.includes("isuzu")
  ) {
    return {
      code: "PICKUP_DOUBLE_CAB" as const,
      labelAr: tr("بيك أب غمارتين 4x4", "4x4 Double Cab Pickup"),
      wheelFrontX: 52,
      wheelRearX: 194,
      wheelY: 64,
      wheelR: 16,
    };
  }

  if (
    m.includes("انوفا") ||
    m.includes("إنوفا") ||
    m.includes("فاغن") ||
    m.includes("واجن") ||
    m.includes("كرنفال") ||
    m.includes("innova") ||
    m.includes("mpv") ||
    m.includes("wagon")
  ) {
    return {
      code: "INNOVA_MPV" as const,
      labelAr: tr("واجن عائلية MPV", "MPV Family Wagon"),
      wheelFrontX: 52,
      wheelRearX: 186,
      wheelY: 65,
      wheelR: 15,
    };
  }

  if (
    m.includes("لاند") ||
    m.includes("كروزر") ||
    m.includes("برادو") ||
    m.includes("فورتشنر") ||
    m.includes("تاهو") ||
    m.includes("يوكن") ||
    m.includes("باترول") ||
    m.includes("جيب") ||
    m.includes("suv") ||
    m.includes("land") ||
    m.includes("tahoe")
  ) {
    return {
      code: "SUV_4X4" as const,
      labelAr: tr("دفع رباعي ملكي SUV", "Royal 4x4 SUV"),
      wheelFrontX: 54,
      wheelRearX: 188,
      wheelY: 64,
      wheelR: 17,
    };
  }

  if (
    m.includes("هايس") ||
    m.includes("فان") ||
    m.includes("باص") ||
    m.includes("ستاريا") ||
    m.includes("ميكروباص") ||
    m.includes("hiace") ||
    m.includes("van") ||
    m.includes("bus")
  ) {
    return {
      code: "HIACE_VAN" as const,
      labelAr: tr("فان نقل وإمداد", "Transport Van"),
      wheelFrontX: 54,
      wheelRearX: 186,
      wheelY: 65,
      wheelR: 15,
    };
  }

  return {
    code: "YARIS_SEDAN" as const,
    labelAr: tr("سيدان انسيابية", "Aerodynamic Sedan"),
    wheelFrontX: 52,
    wheelRearX: 182,
    wheelY: 65,
    wheelR: 14.5,
  };
}

export function resolveCarPaint(colorStr: string | null | undefined) {
  const s = (colorStr || "").trim().toLowerCase();

  if (s.includes("ابيض") || s.includes("أبيض") || s.includes("لؤلؤ") || s.includes("white") || s.includes("pearl")) {
    return {
      name: colorStr || tr("أبيض لؤلؤي", "Pearl White"),
      top: "#ffffff",
      mid: "#f1f5f9",
      deep: "#94a3b8",
      shadow: "#334155",
      stroke: "rgba(255,255,255,0.92)",
      ambient: "rgba(243, 223, 174, 0.20)",
      swatch: "linear-gradient(135deg, #ffffff, #94a3b8)",
    };
  }
  if (s.includes("اسود") || s.includes("أسود") || s.includes("ملك") || s.includes("black")) {
    return {
      name: colorStr || tr("أسود ملكي", "Royal Black"),
      top: "#64748b",
      mid: "#1e293b",
      deep: "#090d16",
      shadow: "#020617",
      stroke: "rgba(243, 223, 174, 0.8)",
      ambient: "rgba(201, 164, 100, 0.26)",
      swatch: "linear-gradient(135deg, #475569, #020617)",
    };
  }
  if (s.includes("احمر") || s.includes("أحمر") || s.includes("عناب") || s.includes("دم") || s.includes("red") || s.includes("maroon")) {
    return {
      name: colorStr || tr("أحمر ياقوتي", "Ruby Red"),
      top: "#fda4af",
      mid: "#e11d48",
      deep: "#881337",
      shadow: "#4c0519",
      stroke: "rgba(254,205,211,0.8)",
      ambient: "rgba(225, 29, 72, 0.26)",
      swatch: "linear-gradient(135deg, #fb7185, #881337)",
    };
  }
  if (s.includes("ازرق") || s.includes("أزرق") || s.includes("كحل") || s.includes("سماو") || s.includes("blue")) {
    return {
      name: colorStr || tr("أزرق ملكي", "Royal Blue"),
      top: "#93c5fd",
      mid: "#2563eb",
      deep: "#1e3a8a",
      shadow: "#0f172a",
      stroke: "rgba(191,219,254,0.8)",
      ambient: "rgba(37, 99, 235, 0.26)",
      swatch: "linear-gradient(135deg, #60a5fa, #1e3a8a)",
    };
  }
  if (
    s.includes("ذهب") ||
    s.includes("بيج") ||
    s.includes("شامب") ||
    s.includes("صحراو") ||
    s.includes("اصفر") ||
    s.includes("أصفر") ||
    s.includes("gold") ||
    s.includes("beige")
  ) {
    return {
      name: colorStr || tr("ذهبي شامبين", "Champagne Gold"),
      top: "#fff3d6",
      mid: "#c9a464",
      deep: "#7d5d27",
      shadow: "#3d2808",
      stroke: "rgba(255, 243, 214, 0.88)",
      ambient: "rgba(201, 164, 100, 0.30)",
      swatch: "linear-gradient(135deg, #fff3d6, #7d5d27)",
    };
  }
  if (s.includes("اخضر") || s.includes("أخضر") || s.includes("زيت") || s.includes("زمرد") || s.includes("green")) {
    return {
      name: colorStr || tr("أخضر زمردي", "Emerald Green"),
      top: "#6ee7b7",
      mid: "#059669",
      deep: "#064e3b",
      shadow: "#022c22",
      stroke: "rgba(167,243,208,0.8)",
      ambient: "rgba(16, 185, 129, 0.25)",
      swatch: "linear-gradient(135deg, #34d399, #064e3b)",
    };
  }
  return {
    name: colorStr || tr("فضي ميتاليك", "Metallic Silver"),
    top: "#ffffff",
    mid: "#94a3b8",
    deep: "#475569",
    shadow: "#1e293b",
    stroke: "rgba(241,245,249,0.85)",
    ambient: "rgba(148, 163, 184, 0.24)",
    swatch: "linear-gradient(135deg, #f8fafc, #475569)",
  };
}

function getDocMeta(days: number | null, span = 365) {
  if (days === null) {
    return {
      state: "soon" as const,
      bdCls: "a",
      badgeText: tr("غير مسجّلة", "Not recorded"),
      color: "#e6b964",
      glow: "rgba(230, 185, 100, 0.52)",
      pct: 52,
    };
  }
  if (days <= 0) {
    return {
      state: "expired" as const,
      bdCls: "r",
      badgeText: days === 0 ? tr("ينتهي اليوم", "Today") : tr(`منذ ${Math.abs(days)} يوم`, `${Math.abs(days)}d ago`),
      color: "#ee8f86",
      glow: "rgba(238, 143, 134, 0.56)",
      pct: 34,
    };
  }
  if (days <= 30) {
    const pct = Math.max(48, Math.min(68, Math.round((days / 30) * 62)));
    return {
      state: "soon" as const,
      bdCls: "a",
      badgeText: tr(`بعد ${days} يوم`, `in ${days}d`),
      color: "#e6b964",
      glow: "rgba(230, 185, 100, 0.52)",
      pct,
    };
  }
  const pct = Math.min(94, Math.max(76, Math.round((days / span) * 100)));
  return {
    state: "valid" as const,
    bdCls: "g",
    badgeText: tr(`بعد ${days} يوم`, `in ${days}d`),
    color: "#7ccfa2",
    glow: "rgba(124, 207, 162, 0.48)",
    pct,
  };
}

function AuthenticVehicleSVG({
  v,
  paint,
  statusColor,
  isExpired,
  sfx,
}: {
  v: Vehicle;
  paint: ReturnType<typeof resolveCarPaint>;
  statusColor: string;
  isExpired: boolean;
  sfx: string;
}) {
  const uid = `${v.id}-${sfx}`;
  const model = detectCarModel(v.make);
  const wf = model.wheelFrontX;
  const wr = model.wheelRearX;
  const wy = model.wheelY;
  const r = model.wheelR;

  return (
    <svg viewBox="0 0 232 84" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <linearGradient id={`bodyPaint-${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor={paint.top} />
          <stop offset="40%" stopColor={paint.mid} />
          <stop offset="80%" stopColor={paint.deep} />
          <stop offset="100%" stopColor={paint.shadow} />
        </linearGradient>

        <linearGradient id={`shimmer-${uid}`} x1="-40%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.62" />
          <stop offset="55%" stopColor="#fff3d6" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          <animate attributeName="x1" values="-60%;120%" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="x2" values="20%;200%" dur="2.4s" repeatCount="indefinite" />
        </linearGradient>

        <linearGradient id={`winGlass-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="45%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        <linearGradient id={`beamCone-${uid}`} x1="100%" y1="50%" x2="0%" y2="50%">
          <stop offset="0%" stopColor="#fff3d6" stopOpacity="0.96" />
          <stop offset="45%" stopColor={statusColor} stopOpacity="0.38" />
          <stop offset="100%" stopColor={statusColor} stopOpacity="0" />
        </linearGradient>

        <linearGradient id={`tailStreak-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
        </linearGradient>
      </defs>

      <polygon points="16,46 -105,14 -105,76" fill={`url(#beamCone-${uid})`} />
      <polygon points="16,45 -78,33 -78,57" fill={`url(#beamCone-${uid})`} opacity="0.78" />
      <rect x="218" y="36" width="46" height="4" rx="2" fill={`url(#tailStreak-${uid})`} />

      <ellipse cx="118" cy="73" rx="98" ry="6.8" fill={paint.mid} opacity="0.48" filter="blur(7px)" />
      <ellipse cx="118" cy="73" rx="72" ry="3.5" fill={statusColor} opacity="0.82" filter="blur(4px)" />

      {model.code === "INNOVA_MPV" && (
        <>
          <path d="M84,12 L195,12 L199,15 L80,15 Z" fill="#f3dfae" opacity="0.92" />
          <path d="M204,15 L217,14 L214,21 L202,20 Z" fill={`url(#bodyPaint-${uid})`} stroke={paint.stroke} strokeWidth="0.8" />
          <path
            d="M12,56 C11,46 15,39 24,36 L44,31 L75,16 C82,13 92,13 108,13 L196,14 C205,14 211,17 214,25 L219,42 C221,47 221,54 219,58 C217,61 213,62 206,62 L20,62 C14,62 12,59 12,56 Z"
            fill={`url(#bodyPaint-${uid})`}
            stroke={paint.stroke}
            strokeWidth="1.3"
          />
          <path d="M24,36 L44,31 L75,16 C82,13 92,13 108,13 L196,14 C205,14 211,17 214,25 L216,38 L16,41 Z" fill={`url(#shimmer-${uid})`} />
          <path d="M72,56 L166,56" stroke="#c9a464" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M28,43 L212,39" stroke="#fff3d6" strokeWidth="1.4" strokeLinecap="round" opacity="0.88" />
          <path d="M77,18 L50,32 L102,32 L102,16 L85,16 C81,16 79,17 77,18 Z" fill={`url(#winGlass-${uid})`} stroke="rgba(255,243,214,0.6)" strokeWidth="1" />
          <path d="M106,16 L106,32 L158,32 L158,16 Z" fill={`url(#winGlass-${uid})`} stroke="rgba(255,243,214,0.6)" strokeWidth="1" />
          <path d="M162,16 L162,32 L208,31 L202,19 C199,17 195,16 189,16 Z" fill={`url(#winGlass-${uid})`} stroke="rgba(255,243,214,0.6)" strokeWidth="1" />
          <path d="M49,32.5 L209,31.5" stroke="#fff3d6" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M104,16 L104,56 M160,16 L160,55" stroke="rgba(15,23,42,0.55)" strokeWidth="1.1" />
          <rect x="88" y="36" width="10" height="2.5" rx="1.2" fill="#fff3d6" />
          <rect x="142" y="36" width="10" height="2.5" rx="1.2" fill="#fff3d6" />
          <path d="M13,42 L32,37 L29,45 L13,46 Z" fill="#ffffff" stroke="#fff3d6" strokeWidth="1" />
          <circle cx="19" cy="54" r="2.8" fill="#fff3d6" stroke="#c9a464" strokeWidth="1" />
          <path d="M213,32 L219,32 L220,46 L212,46 Z" fill="#f43f5e" />
        </>
      )}

      {model.code === "PICKUP_DOUBLE_CAB" && (
        <>
          <path d="M148,14 L154,14 L182,31 L176,31 Z" fill="#334155" stroke="#fff3d6" strokeWidth="1.1" />
          <path d="M148,14 L148,32" stroke="#f3dfae" strokeWidth="3.2" />
          <rect x="149" y="29" width="68" height="4" rx="1" fill="#0f172a" stroke="#c9a464" strokeWidth="0.9" />
          <path
            d="M12,52 C12,41 16,35 26,33 L54,30 L74,15 C80,11 88,10 102,10 L142,10 C146,10 148,12 148,17 L148,31 L216,31 C220,31 222,33 222,38 L222,52 C222,56 219,58 214,58 L20,58 C14,58 12,55 12,52 Z"
            fill={`url(#bodyPaint-${uid})`}
            stroke={paint.stroke}
            strokeWidth="1.3"
          />
          <path d="M26,33 L54,30 L74,15 C80,11 88,10 102,10 L142,10 L148,31 L218,31 L218,40 L15,41 Z" fill={`url(#shimmer-${uid})`} />
          <line x1="148" y1="30" x2="148" y2="58" stroke="#020617" strokeWidth="2.5" />
          <rect x="72" y="57" width="76" height="3.8" rx="1.8" fill="#1e293b" stroke="#f3dfae" strokeWidth="1" />
          <path d="M77,16 L58,30 L105,30 L105,14 L84,14 C80,14 78,15 77,16 Z" fill={`url(#winGlass-${uid})`} stroke="rgba(255,243,214,0.6)" strokeWidth="1" />
          <path d="M109,14 L109,30 L142,30 L142,14 Z" fill={`url(#winGlass-${uid})`} stroke="rgba(255,243,214,0.6)" strokeWidth="1" />
          <path d="M107,14 L107,56" stroke="rgba(15,23,42,0.55)" strokeWidth="1.2" />
          <rect x="91" y="34" width="9" height="2.4" rx="1" fill="#fff3d6" />
          <rect x="128" y="34" width="9" height="2.4" rx="1" fill="#fff3d6" />
          <text x="191" y="42" fill="#fff3d6" fontSize="7" fontWeight="900" fontFamily="monospace">
            4x4 VIP
          </text>
          <path d="M31,58 A21,21 0 0,1 73,58" fill="#050811" stroke="#c9a464" strokeWidth="2.4" />
          <path d="M173,58 A21,21 0 0,1 215,58" fill="#050811" stroke="#c9a464" strokeWidth="2.4" />
          <path d="M12,36 L16,35 L16,49 L12,49 Z" fill="#fff3d6" />
          <path d="M15,38 L30,35 L28,43 L15,43 Z" fill="#ffffff" />
          <rect x="216" y="34" width="5.5" height="13" rx="1.5" fill="#f43f5e" />
          <rect x="214" y="52" width="10" height="5" rx="2" fill="#1e293b" stroke="#f3dfae" strokeWidth="1" />
        </>
      )}

      {model.code === "SUV_4X4" && (
        <>
          <path d="M78,10 L198,10 L202,13 L74,13 Z" fill="#f3dfae" opacity="0.92" />
          <path
            d="M12,54 C12,41 16,35 26,33 L56,29 L74,14 C79,11 88,10 102,10 L202,10 C209,10 213,13 215,21 L219,38 C220,45 220,53 218,58 L18,58 C14,58 12,56 12,54 Z"
            fill={`url(#bodyPaint-${uid})`}
            stroke={paint.stroke}
            strokeWidth="1.3"
          />
          <path d="M26,33 L56,29 L74,14 L202,10 L215,21 L217,36 L15,39 Z" fill={`url(#shimmer-${uid})`} />
          <path
            d="M77,15 L59,29 L106,29 L106,13 L83,13 Z M110,13 L110,29 L158,29 L158,13 Z M162,13 L162,29 L210,29 L206,14 Z"
            fill={`url(#winGlass-${uid})`}
            stroke="rgba(255,243,214,0.6)"
            strokeWidth="1"
          />
          <rect x="74" y="57" width="90" height="3.5" rx="1.5" fill="#1e293b" stroke="#f3dfae" strokeWidth="1" />
          <path d="M13,38 L30,35 L28,44 L13,44 Z" fill="#ffffff" />
          <rect x="213" y="32" width="6" height="13" rx="1.5" fill="#f43f5e" />
        </>
      )}

      {model.code === "HIACE_VAN" && (
        <>
          <path
            d="M14,56 C14,44 18,36 25,28 L38,14 C43,10 52,9 68,9 L206,9 C213,9 217,13 218,22 L219,55 C219,59 216,61 209,61 L20,61 C15,61 14,59 14,56 Z"
            fill={`url(#bodyPaint-${uid})`}
            stroke={paint.stroke}
            strokeWidth="1.3"
          />
          <path d="M25,28 L38,14 L206,9 L218,22 L218,35 L16,36 Z" fill={`url(#shimmer-${uid})`} />
          <path
            d="M42,14 L28,29 L74,29 L74,13 Z M79,13 L79,29 L142,29 L142,13 Z M147,13 L147,29 L211,29 L210,13 Z"
            fill={`url(#winGlass-${uid})`}
            stroke="rgba(255,243,214,0.6)"
            strokeWidth="1"
          />
          <path d="M14,42 L26,39 L25,47 L14,47 Z" fill="#ffffff" />
          <rect x="214" y="32" width="5" height="16" rx="1.5" fill="#f43f5e" />
        </>
      )}

      {model.code === "YARIS_SEDAN" && (
        <>
          <path
            d="M14,56 C13,47 18,40 30,37 L52,33 L82,17 C91,13 103,12 122,12 L158,13 C171,14 182,18 192,29 L208,33 C213,35 215,40 215,49 L214,57 C213,60 209,62 202,62 L22,62 C16,62 14,59 14,56 Z"
            fill={`url(#bodyPaint-${uid})`}
            stroke={paint.stroke}
            strokeWidth="1.3"
          />
          <path d="M30,37 L52,33 L82,17 C91,13 103,12 122,12 L158,13 C171,14 182,18 192,29 L208,33 L212,41 L18,43 Z" fill={`url(#shimmer-${uid})`} />
          <path d="M34,46 Q115,42 209,36" stroke="#fff3d6" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.92" />
          <path d="M74,56 L162,56" stroke="#c9a464" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M85,19 L58,33 L114,33 L114,16 L96,16 C91,16 88,17 85,19 Z" fill={`url(#winGlass-${uid})`} stroke="rgba(255,243,214,0.6)" strokeWidth="1" />
          <path d="M118,16 L118,33 L182,32 L168,18 C163,16 157,16 148,16 Z" fill={`url(#winGlass-${uid})`} stroke="rgba(255,243,214,0.6)" strokeWidth="1" />
          <path d="M57,33.5 L183,32.5" stroke="#fff3d6" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M116,16 L116,56" stroke="rgba(15,23,42,0.55)" strokeWidth="1.1" />
          <rect x="98" y="37" width="9" height="2.4" rx="1" fill="#fff3d6" />
          <rect x="148" y="36" width="9" height="2.4" rx="1" fill="#fff3d6" />
          <path d="M158,13 L165,9 L167,13 Z" fill={`url(#bodyPaint-${uid})`} stroke={paint.stroke} strokeWidth="0.8" />
          <path d="M15,43 L34,38 L31,46 L15,47 Z" fill="#ffffff" stroke="#fff3d6" strokeWidth="1" />
          <path d="M14,50 L24,50 L22,56 L14,56 Z" fill="#090d16" stroke="#c9a464" strokeWidth="0.8" />
          <path d="M204,35 L214,35 L215,45 L202,44 Z" fill="#f43f5e" />
        </>
      )}

      <path d="M62,28 C56,28 53,31 55,34 L65,34 Z" fill={`url(#bodyPaint-${uid})`} stroke={paint.stroke} strokeWidth="0.9" />
      <circle cx="56" cy="31.5" r="1.6" fill="#fbbf24" />

      {isExpired && (
        <>
          <circle cx="17" cy="51" r="4.6" fill="#f59e0b">
            <animate attributeName="opacity" values="1;0.1;1" dur="0.48s" repeatCount="indefinite" />
          </circle>
          <circle cx="215" cy="49" r="4.6" fill="#f59e0b">
            <animate attributeName="opacity" values="1;0.1;1" dur="0.48s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {[wf, wr].map((wx, wi) => (
        <g key={wi} transform={`translate(${wx}, ${wy})`}>
          <circle r={r} fill="#07090e" stroke="#1e293b" strokeWidth="2.8" />
          <circle r={r - 3.8} fill="#141824" stroke="#f3dfae" strokeWidth="1" />
          <path d="M-8,-5 A9,9 0 0,1 -2,-9" stroke="#ef4444" strokeWidth="3.5" fill="none" />
          <g className="wheel-spin-fast">
            <circle r={r - 5.2} fill="none" stroke="#fff3d6" strokeWidth="2" strokeDasharray="4.5 3" />
            <line x1={-(r - 5)} y1="0" x2={r - 5} y2="0" stroke="#e8cc8e" strokeWidth="1.6" />
            <line x1="0" y1={-(r - 5)} x2="0" y2={r - 5} stroke="#e8cc8e" strokeWidth="1.6" />
            <line x1="-6" y1="-6" x2="6" y2="6" stroke="#c9a464" strokeWidth="1.2" />
            <line x1="6" y1="-6" x2="-6" y2="6" stroke="#c9a464" strokeWidth="1.2" />
            <circle r="3.2" fill="#fff3d6" stroke="#090d16" strokeWidth="1" />
          </g>
        </g>
      ))}
    </svg>
  );
}

function MiniAuthenticCar({
  make,
  paint,
  statusColor,
}: {
  make: string;
  paint: ReturnType<typeof resolveCarPaint>;
  statusColor: string;
}) {
  const model = detectCarModel(make);
  let d = "";
  if (model.code === "PICKUP_DOUBLE_CAB") {
    d = "M3,14 C3,10 6,8 11,8 L16,3 C18,2 25,2 27,3 L28,8 L41,8 C43,8 44,9 44,13 L44,16 L4,16 Z";
  } else if (model.code === "INNOVA_MPV" || model.code === "SUV_4X4" || model.code === "HIACE_VAN") {
    d = "M3,14 C3,10 6,8 11,7 L18,2 C21,1.5 36,1.5 40,3 L43,9 C44,11 44,14 43,16 L4,16 Z";
  } else {
    d = "M3,14 C3,10 6,8 12,8 L18,3 C21,2 29,2 33,5 L41,8 C43,9 44,11 44,14 L44,16 L4,16 Z";
  }

  return (
    <svg viewBox="0 0 48 20" style={{ width: 48, height: 21, overflow: "visible", filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.95))" }}>
      <polygon points="4,12 -18,4 -18,20" fill="#fff3d6" opacity="0.88" />
      <path d={d} fill={paint.mid} stroke={paint.top} strokeWidth="1.35" />
      <circle cx="12" cy="16.5" r="3.7" fill="#090d16" stroke={statusColor} strokeWidth="1.5" />
      <circle cx="35" cy="16.5" r="3.7" fill="#090d16" stroke={statusColor} strokeWidth="1.5" />
    </svg>
  );
}

function FiligreeCorner({ cls }: { cls: "tr" | "tl" | "br" | "bl" }) {
  return (
    <svg className={`rx-filigree ${cls}`} viewBox="0 0 32 32" fill="none">
      <path d="M2 2 H24 C27.3 2 30 4.7 30 8 V30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 6 H21 C23.8 6 26 8.2 26 11 V24" stroke="currentColor" strokeWidth="1" opacity="0.65" />
      <circle cx="25" cy="7" r="2" fill="currentColor" />
    </svg>
  );
}

const dmy = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");

export function ImperialVehicleCard({
  v,
  index,
  canEdit,
  canDelete,
  onRenew,
  onEdit,
  onDelete,
}: {
  v: Vehicle;
  index: number;
  canEdit: boolean;
  canDelete: boolean;
  onRenew: (v: Vehicle) => void;
  onEdit: (v: Vehicle) => void;
  onDelete: (v: Vehicle) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const moverRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef<HTMLSpanElement | null>(null);
  const gate0Ref = useRef<HTMLDivElement | null>(null);
  const gate1Ref = useRef<HTMLDivElement | null>(null);
  const gate2Ref = useRef<HTMLDivElement | null>(null);

  const paint = resolveCarPaint(v.color);
  const modelInfo = detectCarModel(v.make);

  const insp = getDocMeta(v.inspectionDays, 365);
  const ins = getDocMeta(v.insuranceDays, 365);
  const reg = getDocMeta(v.registrationDays, 1095);
  const overall = getDocMeta(v.nearestDays, 365);

  const readinessScore = Math.round((insp.pct + ins.pct + reg.pct) / 3);
  const dashOffset = Math.round(113 - (113 * readinessScore) / 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    const carEl = moverRef.current;
    if (!canvas || !carEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let af = 0;
    let offset = index * 45;
    let archOffset = index * 110;
    let cityOffset = index * 60;
    let time = index * 1.9;

    const particles = Array.from({ length: 24 }, () => ({
      x: Math.random() * 440,
      y: 28 + Math.random() * 155,
      len: 26 + Math.random() * 60,
      spd: 3.0 + Math.random() * 4.8,
      alpha: 0.14 + Math.random() * 0.42,
    }));

    const sparks = Array.from({ length: 14 }, () => ({
      rx: Math.random() * 55,
      ry: Math.random() * 14,
      size: 1 + Math.random() * 1.8,
      spd: 1.5 + Math.random() * 3.0,
    }));

    const buildings = [
      { dx: 0, bw: 28, bh: 65 },
      { dx: 34, bw: 22, bh: 48 },
      { dx: 64, bw: 32, bh: 88 },
      { dx: 104, bw: 26, bh: 54 },
      { dx: 138, bw: 36, bh: 74 },
      { dx: 182, bw: 24, bh: 44 },
      { dx: 214, bw: 30, bh: 82 },
      { dx: 252, bw: 28, bh: 58 },
      { dx: 286, bw: 26, bh: 46 },
    ];

    const tick = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) {
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== Math.floor(rect.width * dpr)) {
          canvas.width = Math.floor(rect.width * dpr);
          canvas.height = Math.floor(rect.height * dpr);
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        const w = rect.width;
        const h = rect.height;
        ctx.clearRect(0, 0, w, h);

        const speedMult = 1.05;
        offset = (offset + 5.4 * speedMult) % 64;
        archOffset = (archOffset + 2.5 * speedMult) % 210;
        cityOffset = (cityOffset + 0.55 * speedMult) % 320;
        time += 0.027 * speedMult;

        if (speedRef.current) {
          const kmh = Math.round(116 + Math.sin(time * 2.2) * 7);
          speedRef.current.textContent = `${kmh} KM/H`;
        }

        const roadTop = h - 68;

        ctx.fillStyle = "rgba(201, 164, 100, 0.045)";
        ctx.strokeStyle = "rgba(232, 204, 142, 0.14)";
        ctx.lineWidth = 1;
        for (let tile = -320 + cityOffset; tile < w + 320; tile += 320) {
          for (const b of buildings) {
            const bx = tile + b.dx;
            const by = roadTop - b.bh;
            ctx.fillRect(bx, by, b.bw, b.bh);
            ctx.strokeRect(bx, by, b.bw, b.bh);
          }
        }

        for (let ax = -120 + archOffset; ax < w + 120; ax += 210) {
          const poleGrad = ctx.createLinearGradient(ax, 36, ax, roadTop);
          poleGrad.addColorStop(0, "rgba(255, 243, 214, 0.45)");
          poleGrad.addColorStop(1, "rgba(201, 164, 100, 0.04)");
          ctx.strokeStyle = poleGrad;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(ax, roadTop);
          ctx.lineTo(ax, 50);
          ctx.lineTo(ax - 26, 40);
          ctx.stroke();

          const lampGlow = ctx.createRadialGradient(ax - 26, 40, 1, ax - 26, 40, 28);
          lampGlow.addColorStop(0, "rgba(255, 243, 214, 0.72)");
          lampGlow.addColorStop(1, "transparent");
          ctx.fillStyle = lampGlow;
          ctx.beginPath();
          ctx.arc(ax - 26, 40, 28, 0, Math.PI * 2);
          ctx.fill();
        }

        for (const p of particles) {
          p.x += p.spd * speedMult;
          if (p.x - p.len > w) p.x = -25;
          const grad = ctx.createLinearGradient(p.x - p.len, p.y, p.x, p.y);
          grad.addColorStop(0, "transparent");
          grad.addColorStop(1, `rgba(255, 243, 214, ${p.alpha})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x - p.len, p.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }

        const roadGrad = ctx.createLinearGradient(0, roadTop, 0, h);
        roadGrad.addColorStop(0, "#0b0e17");
        roadGrad.addColorStop(0.45, "#141928");
        roadGrad.addColorStop(1, "#040508");
        ctx.fillStyle = roadGrad;
        ctx.fillRect(0, roadTop, w, 68);

        ctx.strokeStyle = "rgba(243, 223, 174, 0.52)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, roadTop);
        ctx.lineTo(w, roadTop);
        ctx.stroke();

        const laneY = h - 31;
        for (let x = -64 + offset; x < w + 64; x += 64) {
          ctx.fillStyle = "rgba(255, 243, 214, 0.85)";
          ctx.fillRect(x, laneY, 30, 3);
          ctx.fillStyle = overall.color;
          ctx.beginPath();
          ctx.arc(x + 46, laneY + 1.5, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        const maxRight = Math.max(16, w - 260);
        const normWave = (Math.sin(time * 0.82) + 1) / 2;
        const carRightPx = 10 + normWave * (maxRight - 10);
        const carBobY = Math.sin(time * 3.6) * 1.8;
        const carPitch = Math.cos(time * 0.82) * -0.58;

        carEl.style.right = `${carRightPx}px`;
        carEl.style.transform = `translateY(${carBobY.toFixed(2)}px) rotate(${carPitch.toFixed(2)}deg)`;

        const carLeftX = w - carRightPx - 252;
        const carCenterX = carLeftX + 126;

        const slipGrad = ctx.createLinearGradient(carLeftX - 20, 0, carLeftX + 260, 0);
        slipGrad.addColorStop(0, "transparent");
        slipGrad.addColorStop(0.35, "rgba(255, 243, 214, 0.55)");
        slipGrad.addColorStop(0.75, overall.color);
        slipGrad.addColorStop(1, "transparent");
        ctx.strokeStyle = slipGrad;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(carLeftX - 15, h - 46);
        ctx.quadraticCurveTo(carLeftX + 95, h - 108, carLeftX + 255, h - 58);
        ctx.stroke();

        const rearWheelX = carLeftX + 215;
        const rearWheelY = h - 28;
        for (const sp of sparks) {
          sp.rx = (sp.rx + sp.spd * speedMult) % 58;
          const sx = rearWheelX + sp.rx;
          const sy = rearWheelY - sp.rx * 0.18 + Math.sin(time * 8 + sp.rx) * 2;
          const alpha = Math.max(0, 1 - sp.rx / 58);
          ctx.fillStyle = `rgba(255, 215, 130, ${alpha * 0.85})`;
          ctx.beginPath();
          ctx.arc(sx, sy, sp.size, 0, Math.PI * 2);
          ctx.fill();
        }

        const carCenterRatio = (carRightPx + 126) / w;
        gate0Ref.current?.classList.toggle("gate-active", carCenterRatio < 0.38);
        gate1Ref.current?.classList.toggle("gate-active", carCenterRatio >= 0.34 && carCenterRatio <= 0.68);
        gate2Ref.current?.classList.toggle("gate-active", carCenterRatio > 0.64);

        const scanGrad = ctx.createLinearGradient(carCenterX, 86, carCenterX, h - 42);
        scanGrad.addColorStop(0, "transparent");
        scanGrad.addColorStop(0.5, overall.glow);
        scanGrad.addColorStop(1, "transparent");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(carCenterX - 22, 86, 44, h - 128);

        ctx.restore();
      }
      af = requestAnimationFrame(tick);
    };

    af = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(af);
  }, [index, overall.color, overall.glow]);

  const insTypeLabel =
    v.insuranceType === "COMPREHENSIVE"
      ? tr("شامل", "Comprehensive")
      : v.insuranceType === "THIRD_PARTY"
        ? tr("ضد الغير", "Third Party")
        : tr("وثيقة التأمين", "Insurance policy");

  const documents = [
    {
      idx: 0,
      gateRef: gate0Ref,
      title: tr("الفحص الدوري", "Periodic Inspection"),
      sub: tr("سلامة المركبة المرورية", "Vehicle roadworthiness"),
      icon: "🔧",
      date: dmy(v.inspectionExpiry),
      meta: insp,
    },
    {
      idx: 1,
      gateRef: gate1Ref,
      title: tr("وثيقة التأمين", "Insurance Policy"),
      sub: v.insurer ? `${v.insurer} · ${insTypeLabel}` : insTypeLabel,
      icon: "🛡️",
      date: dmy(v.insuranceExpiry),
      meta: ins,
    },
    {
      idx: 2,
      gateRef: gate2Ref,
      title: tr("رخصة السير (الاستمارة)", "Registration (Istimara)"),
      sub: v.serialNumber ? `${tr("الرقم التسلسلي:", "Serial:")} ${v.serialNumber}` : tr("رخصة سير المركبة", "Vehicle registration"),
      icon: "📋",
      date: dmy(v.registrationExpiry),
      meta: reg,
    },
  ];

  const plateNumAr = toArabicDigits(v.plateNumber);
  const plateNumEn = toEnglishDigits(v.plateNumber);
  const plateLettersAr = v.plateLetters;
  const plateLettersEn = toEnglishPlateLetters(v.plateLetters);

  return (
    <article
      className="rx-vcard"
      style={{
        ["--card-accent" as string]: overall.glow,
        ["--paint-ambient" as string]: paint.ambient,
        animationDelay: `${index * 65}ms`,
      }}
    >
      <div className="rx-beam" />
      <FiligreeCorner cls="tr" />
      <FiligreeCorner cls="tl" />
      <FiligreeCorner cls="br" />
      <FiligreeCorner cls="bl" />

      <div className="stage-wrap">
        <canvas ref={canvasRef} className="stage-canvas" />

        <div className="stage-top-bar">
          <span className="rx-stage-pill">
            <span>🚘</span>
            <span>{modelInfo.labelAr}</span>
          </span>

          <span className="rx-speed-hud">
            <i />
            <span ref={speedRef}>116 KM/H</span>
          </span>

          <span className="rx-stage-pill">
            <span
              className="paint-sphere"
              style={{
                background: paint.swatch,
                ["--sphere-glow" as string]: paint.mid,
              }}
            />
            <span>
              {tr("اللون:", "Color:")} <b style={{ color: "#fff3d6" }}>{paint.name}</b>
            </span>
          </span>
        </div>

        <div className="stage-gates-grid">
          {documents.map((doc) => (
            <div
              key={doc.idx}
              ref={doc.gateRef}
              className="checkpoint-gate"
              style={{ ["--gate-color" as string]: doc.meta.color }}
            >
              <div className="gate-top">
                <span>
                  {doc.icon} {doc.title.split(" ")[0]}
                </span>
                <span
                  className="gate-dot"
                  style={{
                    background: doc.meta.color,
                    boxShadow: `0 0 8px ${doc.meta.color}`,
                  }}
                />
              </div>
              <div className="gate-bot">
                <span className="mono" style={{ color: "var(--muted)" }}>
                  {doc.date}
                </span>
                <span style={{ color: doc.meta.color, fontWeight: 800 }}>{doc.meta.badgeText}</span>
              </div>
            </div>
          ))}
        </div>

        <div ref={moverRef} className="stage-car-mover">
          <AuthenticVehicleSVG v={v} paint={paint} statusColor={overall.color} isExpired={overall.state === "expired"} sfx="main" />
          <div className="car-reflection">
            <AuthenticVehicleSVG v={v} paint={paint} statusColor={overall.color} isExpired={false} sfx="refl" />
          </div>
        </div>
      </div>

      <div className="rx-id-section">
        <div className="rx-id-left">
          <div className="rx-gauge-wrap" title={tr("نسبة جاهزية وثائق المركبة", "Document readiness")}>
            <svg width="48" height="48" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="22" cy="22" r="18" fill="rgba(15,16,20,0.9)" stroke="rgba(214,182,120,0.2)" strokeWidth="3.5" />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke={overall.color}
                strokeWidth="3.5"
                strokeDasharray="113"
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            </svg>
            <span className="rx-gauge-val">{readinessScore}%</span>
          </div>

          <div>
            <div className="rx-car-title">
              <span>{v.make}</span>
              {v.year && <span className="rx-year-tag">{v.year}</span>}
            </div>
            <div className="rx-car-meta">
              <span>👤 {v.driver ? tr(v.driver.fullNameAr, v.driver.fullNameEn || v.driver.fullNameAr) : tr("بدون سائق", "Unassigned")}</span>
              <span>·</span>
              <span style={{ color: "#e8cc8e", fontWeight: 700 }}>
                🏛️ {tr(v.branch?.name ?? "بدون مؤسسة", v.branch?.nameEn || v.branch?.name || "No establishment")}
              </span>
            </div>
          </div>
        </div>

        <div className="ksa-plate-pro" aria-label={`${tr("اللوحة", "Plate")} ${plateLettersAr} ${plateNumEn}`}>
          <div className="cell num">
            <span className="ar">{plateNumAr}</span>
            <span className="en">{plateNumEn}</span>
          </div>
          <div className="cell">
            <span className="ar">{plateLettersAr}</span>
            <span className="en">{plateLettersEn}</span>
          </div>
          <div className="band">
            <span>🌴</span>
            <span>KSA</span>
          </div>
        </div>
      </div>

      <div className="rx-timelines-wrap">
        {documents.map((doc) => (
          <div key={doc.idx} className="rx-doc-card">
            <div className="rx-doc-header">
              <div className="rx-doc-title-grp">
                <span className="rx-doc-icon">{doc.icon}</span>
                <div>
                  <div className="rx-doc-name">{doc.title}</div>
                  <div className="rx-doc-sub">{doc.sub}</div>
                </div>
              </div>

              <div className="rx-doc-right">
                <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {doc.date}
                </span>
                <span className={`px-bd ${doc.meta.bdCls}`}>{doc.meta.badgeText}</span>
              </div>
            </div>

            <div className="timeline-track" style={{ ["--doc-pct" as string]: `${doc.meta.pct}%` }}>
              <div className="timeline-dashes" />
              <div
                className="timeline-ribbon"
                style={{
                  ["--doc-pct" as string]: `${doc.meta.pct}%`,
                  background: `linear-gradient(90deg, ${doc.meta.color}, ${paint.mid})`,
                  boxShadow: `0 0 14px ${doc.meta.color}`,
                }}
              />
              <div className="timeline-car-runner" style={{ ["--doc-pct" as string]: `${doc.meta.pct}%` }}>
                <MiniAuthenticCar make={v.make} paint={paint} statusColor={doc.meta.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {(canEdit || canDelete) && (
        <div className="rx-vcard-foot">
          {canEdit && (
            <button type="button" onClick={() => onRenew(v)} className="px-btn pri" style={{ flex: 1, justifyContent: "center" }}>
              <RefreshCw className="h-4 w-4" />
              {tr("تجديد وثائق المركبة", "Renew Documents")}
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={() => onEdit(v)} className="px-ibtn" title={tr("تعديل بيانات المركبة", "Edit Vehicle")}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={() => onDelete(v)} className="px-ibtn del" title={tr("حذف المركبة", "Delete Vehicle")}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
