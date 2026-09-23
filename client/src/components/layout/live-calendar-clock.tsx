import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Moon, Clock, Globe2, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function LiveCalendarClock() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");

  // Keep live time ticking every second
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format dates using native Intl with Umalqura Hijri and Gregorian
  const { dayName, hijriDate, gregDate, formattedTime, amPmText } = useMemo(() => {
    // 1. Day of the week
    let day = "";
    try {
      day = new Intl.DateTimeFormat(isAr ? "ar-SA-u-nu-latn" : "en-US", { weekday: "long" }).format(now);
    } catch {
      day = now.toLocaleDateString(isAr ? "ar-SA" : "en-US", { weekday: "long" });
    }

    // 2. Hijri date (Umm al-Qura)
    let hijri = "";
    try {
      hijri = new Intl.DateTimeFormat(
        isAr ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura",
        { day: "numeric", month: isAr ? "long" : "short", year: "numeric" }
      ).format(now);
    } catch {
      try {
        hijri = new Intl.DateTimeFormat(isAr ? "ar-SA-u-ca-islamic" : "en-u-ca-islamic", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(now);
      } catch {
        hijri = "";
      }
    }

    // 3. Gregorian date (Explicitly enforce Gregorian calendar with -u-ca-gregory)
    let greg = "";
    try {
      const gFmt = new Intl.DateTimeFormat(isAr ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", {
        day: "numeric",
        month: isAr ? "long" : "short",
        year: "numeric",
      }).format(now);
      greg = isAr ? `${gFmt} م` : gFmt;
    } catch {
      greg = now.toLocaleDateString(isAr ? "ar-EG" : "en-US");
    }

    // 4. Digital Time (12-hour format with live seconds)
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const isPm = hours >= 12;
    const hours12 = String(hours % 12 || 12).padStart(2, "0");
    const amPm = isAr ? (isPm ? "م" : "ص") : isPm ? "PM" : "AM";

    return {
      dayName: day,
      hijriDate: hijri,
      gregDate: greg,
      formattedTime: { hours: hours12, minutes, seconds },
      amPmText: amPm,
    };
  }, [now, isAr]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex h-10 items-center gap-3 rounded-xl px-3",
            "border border-transparent hover:border-border/70 hover:bg-muted/50 dark:hover:bg-white/[0.04]",
            "transition-colors cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          )}
          title={isAr ? "عرض تفاصيل التقويم والتوقيت" : "View calendar & clock details"}
        >
          {/* Dates: day + Hijri on top, Gregorian underneath */}
          <div className="hidden 2xl:flex flex-col items-end leading-tight text-end">
            <span className="text-[12px] font-bold text-foreground whitespace-nowrap">
              {dayName} <span className="text-muted-foreground/60 mx-0.5">·</span> {hijriDate}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{gregDate}</span>
          </div>

          <span className="hidden 2xl:block h-7 w-px bg-border/80 dark:bg-white/10" />

          {/* Time — isolated as LTR so hh:mm never reorders inside the RTL header */}
          <span dir="ltr" className="flex items-baseline gap-1 whitespace-nowrap">
            <span className="font-mono text-[15px] font-bold tracking-tight text-foreground tabular-nums">
              {formattedTime.hours}:{formattedTime.minutes}
            </span>
            <span className="text-[11px] font-bold text-muted-foreground">{amPmText}</span>
          </span>
        </button>
      </PopoverTrigger>

      {/* Expanded Interactive Calendar & Clock Details Popover */}
      <PopoverContent
        align="center"
        dir={isAr ? "rtl" : "ltr"}
        className="w-80 sm:w-96 p-4 rounded-2xl shadow-luxury border-border/80 glass-card bg-background/95 backdrop-blur-2xl space-y-4 animate-in fade-in-0 zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                {isAr ? "الساعة والتقويم المعتمد" : "System Clock & Calendar"}
              </h4>
              <p className="text-[10px] text-muted-foreground">
                {isAr ? "توقيت مكة المكرمة الرسمي (GMT+3)" : "Official Makkah Time (GMT+3)"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold text-emerald-500 border-emerald-500/30 bg-emerald-500/10 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {isAr ? "متزامن" : "Synchronized"}
          </Badge>
        </div>

        {/* Big Live Digital Clock Display */}
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border/60">
          <div dir="ltr" className="flex items-baseline gap-1 font-mono">
            <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums">
              {formattedTime.hours}
            </span>
            <span className="animate-pulse text-primary font-black text-2xl sm:text-3xl">:</span>
            <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums">
              {formattedTime.minutes}
            </span>
            <span className="animate-pulse text-primary/70 font-bold text-xl sm:text-2xl">:</span>
            <span className="text-xl sm:text-2xl font-bold text-primary tabular-nums">
              {formattedTime.seconds}
            </span>
            <span className="text-xs sm:text-sm font-black text-muted-foreground ms-2">
              {amPmText}
            </span>
          </div>
          <span className="text-xs font-bold text-emerald-500 mt-1">
            {dayName}
          </span>
        </div>

        {/* Dual Date Cards (Hijri & Gregorian) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Hijri Card */}
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
              <Moon className="h-3.5 w-3.5" />
              <span>{isAr ? "التقويم الهجري" : "Hijri"}</span>
            </div>
            <p className="text-xs sm:text-sm font-black text-foreground leading-snug">
              {hijriDate}
            </p>
            <span className="text-[10px] text-muted-foreground font-medium">
              {isAr ? "تقويم أم القرى" : "Umm al-Qura"}
            </span>
          </div>

          {/* Gregorian Card */}
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-blue-500 font-bold text-xs">
              <Calendar className="h-3.5 w-3.5" />
              <span>{isAr ? "التقويم الميلادي" : "Gregorian"}</span>
            </div>
            <p className="text-xs sm:text-sm font-black text-foreground leading-snug">
              {gregDate}
            </p>
            <span className="text-[10px] text-muted-foreground font-medium">
              {isAr ? "الميلادي الدولي" : "Standard International"}
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
          <span className="flex items-center gap-1">
            <Globe2 className="h-3 w-3 text-primary" />
            {isAr ? "المملكة العربية السعودية" : "Kingdom of Saudi Arabia"}
          </span>
          <span className="font-mono text-[10px]">Asia/Riyadh (UTC+3)</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

