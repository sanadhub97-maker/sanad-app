import { useTranslation } from "react-i18next";
import { HeartPulse } from "lucide-react";
import { workforceDocumentsApi } from "@/api/workforceDocuments";
import { WorkforceDocumentsView } from "./workforce-documents-view";

export default function HealthCertificatesPage() {
  const { t } = useTranslation();

  return (
    <WorkforceDocumentsView
      title={t("workforce.healthCertificates.title")}
      subtitle={t("workforce.healthCertificates.subtitle")}
      docType="HEALTH_CERTIFICATE"
      queryFn={workforceDocumentsApi.getHealthCertificates}
      queryKey="workforce-health-certificates"
      icon={HeartPulse}
      tone="emerald"
      numberLabel={t("workforce.healthCertificates.number")}
      authorityLabel={t("workforce.healthCertificates.authority")}
      addButtonLabel={t("workforce.healthCertificates.addTitle")}
    />
  );
}

