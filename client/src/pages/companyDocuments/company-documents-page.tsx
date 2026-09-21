import { useTranslation } from "react-i18next";
import { CompanyDocumentsView } from "@/pages/companyDocuments/company-documents-view";
import { companyDocumentsApi, COMPANY_DOCUMENT_CATEGORIES } from "@/api/companyDocuments";

export default function CompanyDocumentsPage() {
  const { t } = useTranslation();
  return (
    <CompanyDocumentsView
      title={t("companyDocuments.title")}
      description={t("companyDocuments.subtitle")}
      api={companyDocumentsApi}
      categories={COMPANY_DOCUMENT_CATEGORIES}
      queryKey="companyDocuments"
      permissionModule="companyDocuments"
    />
  );
}
