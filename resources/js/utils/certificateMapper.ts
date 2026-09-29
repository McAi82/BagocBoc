// src/utils/certificateMapper.ts

export type CertificateKind =
  | "BarangayClearance"
  | "CertificateOfIndigency"
  | "CertificateOfGoodMoral"
  | "CertificateOfEmployment"
  | "CertificateOfResidency"
  | "Unknown";

/**
 * Map a certification_type name from the DB to one of the
 * available certificate templates.
 */
export function resolveCertificateKind(
  certificationTypeName: string | undefined | null,
): CertificateKind {
  if (!certificationTypeName) return "Unknown";
  const n = certificationTypeName.toLowerCase();

  // Clearance
  if (n.includes("clearance")) return "BarangayClearance";

  // Indigency
  if (n.includes("indigency")) return "CertificateOfIndigency";

  // Good Moral
  if (n.includes("good moral")) return "CertificateOfGoodMoral";

  // Employment
  if (n.includes("employment")) return "CertificateOfEmployment";

  // Residency
  if (n.includes("residency")) return "CertificateOfResidency";

  return "Unknown";
}

/**
 * Build the initial fields object for a certificate template
 * from the certification + resident records.
 */
export function buildCertificateFields(
  kind: CertificateKind,
  certification: any,
): Record<string, string> {
  const resident = certification?.resident || {};
  const type = certification?.certification_type || {};

  const fullName =
    `${resident.first_name || ""} ${resident.middle_name || ""} ${resident.last_name || ""}`
      .replace(/\s+/g, " ")
      .trim();

  const address =
    resident.place_of_birth ||
    resident.address ||
    "Barangay Bagocboc, Opol, Misamis Oriental";

  // Issue date — prefer the release/approval date, else today
  const issueDate = certification?.released_at
    ? new Date(certification.released_at)
    : certification?.approved_at
      ? new Date(certification.approved_at)
      : new Date();

  const day = issueDate.getDate();
  const month = issueDate.toLocaleString("en-US", { month: "long" });
  const year = issueDate.getFullYear();
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const common = {
    residentName: fullName,
    residentAge: resident.age?.toString() || "",
    residentAddress: address,
    civilStatus: resident.civil_status || "Single",
    purpose: (certification?.purpose || "GENERAL PURPOSE").toUpperCase(),
    issuedDay: ordinal(day),
    issuedMonth: month,
    issuedYear: String(year),
    issuedPlace: "Barangay Bagocboc, Opol, Misamis Oriental",
  };

  // Per-template extras
  switch (kind) {
    case "BarangayClearance":
      return {
        ...common,
        orNumber: certification?.payment_reference || "N/A",
        amountPaid: (
          parseFloat(type?.fee) || 0
        ).toFixed(2),
        validUntil: "6 months from date of issue",
      };

    case "CertificateOfResidency":
      return {
        ...common,
        residingSince: "",
        yearsResiding: "",
      };

    case "CertificateOfEmployment":
      return {
        ...common,
        occupation: resident.occupation || "N/A",
        employerOrNature: "Barangay Bagocboc",
        employmentStatus: "employed",
      };

    default:
      return common;
  }
}