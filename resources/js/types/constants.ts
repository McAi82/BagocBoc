// types/reports.ts or constants.ts

export const REPORT_TYPES = {
  collection: {
    id: "collection",
    label: "Collection Report",
    description: "Summary of all collections and payments",
    createdBy: ["Treasurer", "Super Admin"],
    canView: ["Treasurer", "Secretary", "Captain", "Super Admin"],
    canApprove: ["Captain", "Super Admin"],
    canPrint: ["Secretary", "Super Admin"],
  },
  budget: {
    id: "budget",
    label: "Budget Utilization",
    description: "Budget allocation and utilization report",
    createdBy: ["Treasurer", "Super Admin"],
    canView: ["Treasurer", "Secretary", "Captain", "Super Admin"],
    canApprove: ["Captain", "Super Admin"],
    canPrint: ["Secretary", "Super Admin"],
  },
  annual: {
    id: "annual",
    label: "Annual Summary",
    description: "Annual financial summary report",
    createdBy: ["Treasurer", "Super Admin"],
    canView: ["Treasurer", "Secretary", "Captain", "Super Admin"],
    canApprove: ["Captain", "Super Admin"],
    canPrint: ["Secretary", "Super Admin"],
  },
  certificate: {
    id: "certificate",
    label: "Certificate Report",
    description: "Report on certificates issued and payments",
    createdBy: ["Secretary", "Treasurer", "Super Admin"],
    canView: ["Secretary", "Treasurer", "Captain", "Super Admin"],
    canApprove: ["Captain", "Super Admin"],
    canPrint: ["Secretary", "Super Admin"],
  },
  tax: {
    id: "tax",
    label: "Tax Collection Report",
    description: "Summary of tax collections",
    createdBy: ["Treasurer", "Super Admin"],
    canView: ["Treasurer", "Secretary", "Captain", "Super Admin"],
    canApprove: ["Captain", "Super Admin"],
    canPrint: ["Secretary", "Super Admin"],
  },
  payment: {
    id: "payment",
    label: "Payment Summary",
    description: "Summary of all payments received",
    createdBy: ["Secretary", "Treasurer", "Super Admin"],
    canView: ["Secretary", "Treasurer", "Captain", "Super Admin"],
    canApprove: ["Captain", "Super Admin"],
    canPrint: ["Secretary", "Super Admin"],
  },
};

export const getAvailableReportTypes = (userRoles: string[]) => {
  return Object.values(REPORT_TYPES).filter((report) =>
    report.createdBy.some((role) => userRoles.includes(role)),
  );
};

export const canCreateReport = (userRoles: string[], reportType: string) => {
  const report = REPORT_TYPES[reportType as keyof typeof REPORT_TYPES];
  if (!report) return false;
  return report.createdBy.some((role) => userRoles.includes(role));
};

export const canApproveReport = (userRoles: string[]) => {
  return userRoles.some((role) => ["Captain", "Super Admin"].includes(role));
};

export const canPrintReport = (userRoles: string[]) => {
  return userRoles.some((role) => ["Secretary", "Super Admin"].includes(role));
};
