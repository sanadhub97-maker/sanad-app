import { useTranslation } from "react-i18next";
import { Stamp } from "lucide-react";
import { workforceDocumentsApi } from "@/api/workforceDocuments";
import { WorkforceDocumentsView } from "./workforce-documents-view";

export default function VisasPage() {
  const { t } = useTranslation();

  return (
    <WorkforceDocumentsView
      title={t("workforce.visas.title")}
      subtitle={t("workforce.visas.subtitle")}
      docType="VISA"
      queryFn={workforceDocumentsApi.getVisas}
      queryKey="workforce-visas"
      icon={Stamp}
      tone="amber"
      numberLabel={t("workforce.visas.number")}
      authorityLabel={t("workforce.visas.authority")}
      addButtonLabel={t("workforce.visas.addTitle")}
    />
  );
}

