import { useTranslation } from "react-i18next";
import { Plane } from "lucide-react";
import { workforceDocumentsApi } from "@/api/workforceDocuments";
import { WorkforceDocumentsView } from "./workforce-documents-view";

export default function FlightTicketsPage() {
  const { t } = useTranslation();

  return (
    <WorkforceDocumentsView
      title={t("workforce.flightTickets.title")}
      subtitle={t("workforce.flightTickets.subtitle")}
      docType="FLIGHT_TICKET"
      queryFn={workforceDocumentsApi.getFlightTickets}
      queryKey="workforce-flight-tickets"
      icon={Plane}
      tone="rose"
      numberLabel={t("workforce.flightTickets.number")}
      authorityLabel={t("workforce.flightTickets.authority")}
      addButtonLabel={t("workforce.flightTickets.addTitle")}
    />
  );
}

