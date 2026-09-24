import { forwardRef, type InputHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EnglishInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onTranslate: () => void;
  busy?: boolean;
}

/** An English (LTR) text input with a "smart translate" button that fills it
 * from the Arabic field; pair it with useAutoTranslate(). */
export const EnglishInput = forwardRef<HTMLInputElement, EnglishInputProps>(
  ({ onTranslate, busy, className, ...props }, ref) => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === "ar";
    return (
      <div className="flex gap-2 items-center">
        <Input ref={ref} dir="ltr" {...props} className={cn(className, "flex-1 min-w-0")} />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onTranslate}
          title={isAr ? "ترجمة ذكية من الخانة العربية" : "Translate from the Arabic field"}
          className="h-11 px-3 rounded-xl border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold text-xs shrink-0 flex items-center gap-1.5 shadow-xs transition-colors"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-blue-500" />}
          <span className="hidden sm:inline">{isAr ? "ترجمة ذكية" : "Translate"}</span>
        </Button>
      </div>
    );
  }
);
EnglishInput.displayName = "EnglishInput";
