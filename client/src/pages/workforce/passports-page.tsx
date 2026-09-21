import { useTranslation } from "react-i18next";
import { BookUser } from "lucide-react";
import { workforceDocumentsApi } from "@/api/workforceDocuments";
import { WorkforceDocumentsView } from "./workforce-documents-view";

export default function PassportsPage() {
  const { t } = useTranslation();

  return (
    <WorkforceDocumentsView
      title={t("workforce.passports.title")}
      subtitle={t("workforce.passports.subtitle")}
      docType="PASSPORT"
      queryFn={workforceDocumentsApi.getPassports}
      queryKey="workforce-passports"
      icon={BookUser}
      tone="purple"
      numberLabel={t("workforce.passports.number")}
      authorityLabel={t("workforce.passports.country")}
      addButtonLabel={t("workforce.passports.addTitle")}
    />
  );
}

