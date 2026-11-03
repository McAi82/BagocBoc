// src/components/certificates/index.ts

export { default as BarangayClearance } from "./BarangayClearance";
export { default as CertificateOfIndigency } from "./CertificateOfIndigency";
export { default as CertificateOfGoodMoral } from "./CertificateOfGoodMoral";
export { default as CertificateOfEmployment } from "./CertificateOfEmployment";
export { default as CertificateOfResidency } from "./CertificateOfResidency";

// Shared pieces
export {
  DEFAULT_ORG,
  styles,
  GREEN,
  GREEN_DARK,
  EXPORT_OVERRIDES,
} from "./shared/certificateTheme";
export type { Organization, SBMember } from "./shared/certificateTheme";

export {
  ClickableField,
  Sidebar,
  Letterhead,
  Footer,
  SignatureBlock,
  Toolbar,
  useDownloadPdf,
} from "./shared/CertificateChrome";
export type { FieldEditor } from "./shared/CertificateChrome";

export { default as EditFieldModal } from "./shared/EditFieldModal";
export type { EditFieldConfig } from "./shared/EditFieldModal";

export { useFieldEditor } from "./shared/useFieldEditor";