import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ServerErrorPage() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <ServerCrash className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold">{t("errors.serverErrorTitle")}</h1>
      <p className="text-muted-foreground">{t("errors.serverErrorBody")}</p>
      <Button asChild>
        <Link to="/">{t("errors.goToDashboard")}</Link>
      </Button>
    </div>
  );
}
