/** Documents that belong to an establishment, not to an employee: company documents and vehicles. */
export const isEstablishmentSource = (sourceType: string) => sourceType === "COMPANY_DOCUMENT" || sourceType === "VEHICLE";
