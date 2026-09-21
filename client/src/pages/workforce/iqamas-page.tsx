import { useTranslation } from "react-i18next";
import { CreditCard } from "lucide-react";
import { workforceDocumentsApi } from "@/api/workforceDocuments";
import { WorkforceDocumentsView } from "./workforce-documents-view";

export default function IqamasPage() {
  const { t } = useTranslation();

  return (
    <WorkforceDocumentsView
      title={t("workforce.iqamas.title")}
      subtitle={t("workforce.iqamas.subtitle")}
      docType="IQAMA"
      queryFn={workforceDocumentsApi.getIqamas}
      queryKey="workforce-iqamas"
      icon={CreditCard}
      tone="blue"
      numberLabel={t("workforce.iqamas.number")}
      addButtonLabel={t("workforce.iqamas.addTitle")}
    />
  );
}

