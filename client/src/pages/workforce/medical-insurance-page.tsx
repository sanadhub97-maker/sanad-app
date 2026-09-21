import { useTranslation } from "react-i18next";
import { ShieldPlus } from "lucide-react";
import { workforceDocumentsApi } from "@/api/workforceDocuments";
import { WorkforceDocumentsView } from "./workforce-documents-view";

export default function MedicalInsurancePage() {
  const { t } = useTranslation();

  return (
    <WorkforceDocumentsView
      title={t("workforce.medicalInsurance.title")}
      subtitle={t("workforce.medicalInsurance.subtitle")}
      docType="MEDICAL_INSURANCE"
      queryFn={workforceDocumentsApi.getMedicalInsurance}
      queryKey="workforce-medical-insurance"
      icon={ShieldPlus}
      tone="cyan"
      numberLabel={t("workforce.medicalInsurance.number")}
      authorityLabel={t("workforce.medicalInsurance.authority")}
      addButtonLabel={t("workforce.medicalInsurance.addTitle")}
    />
  );
}

