// src/components/certificates/CertificateOfIndigency.tsx

import React, { useRef, useState } from "react";
import {
  styles,
  DEFAULT_ORG,
  EXPORT_OVERRIDES,
} from "./shared/certificateTheme";
import type { Organization } from "./shared/certificateTheme";
import {
  ClickableField,
  Toolbar,
  useDownloadPdf,
  Sidebar,
  Letterhead,
  Footer,
  SignatureBlock,
} from "./shared/CertificateChrome";
import EditFieldModal from "./shared/EditFieldModal";
import { useFieldEditor } from "./shared/useFieldEditor";

interface CertificateProps {
  initialOrg?: Partial<Organization>;
  initialFields?: Record<string, string>;
}

const DEFAULT_FIELDS: Record<string, string> = {
  residentName: "Liza S. Reyes",
  residentAddress: "Purok 3, Barangay Bagocboc, Opol, Misamis Oriental",
  purpose: "SCHOLARSHIP REQUIREMENT",
  issuedDay: "25th",
  issuedMonth: "September",
  issuedYear: "2026",
  issuedPlace: "Barangay Bagocboc, Opol, Misamis Oriental",
};

export default function CertificateOfIndigency({
  initialOrg = {},
  initialFields = {},
}: CertificateProps) {
  const [org, setOrg] = useState<Organization>({
    ...DEFAULT_ORG,
    ...initialOrg,
  });
  const [fields, setFields] = useState<Record<string, string>>({
    ...DEFAULT_FIELDS,
    ...initialFields,
  });
  const certRef = useRef<HTMLDivElement | null>(null);
  const { exporting, handleDownload } = useDownloadPdf(
    certRef,
    `Certificate_of_Indigency_${fields.residentName}`,
  );

  const editor = useFieldEditor({
    onSaveField: (key, value) =>
      setFields((d) => ({ ...d, [key]: value })),
    onSaveOrgField: (key, value) =>
      setOrg((d) => ({ ...d, [key]: value } as Organization)),
    onSaveMemberField: (index, key, value) =>
      setOrg((d) => {
        const members = [...d.sbMembers];
        members[index] = { ...members[index], [key]: value };
        return { ...d, sbMembers: members };
      }),
  });

  return (
    <div style={styles.page}>
      <Toolbar onDownload={handleDownload} exporting={exporting} />

      <div ref={certRef} style={styles.certificate} data-certificate-root="true">
        <Sidebar org={org} fieldEditor={editor} />

        <div style={styles.main}>
          <Letterhead org={org} fieldEditor={editor} />

          <h1 style={styles.certTitle}>CERTIFICATE OF INDIGENCY</h1>

          <p style={styles.toWhom}>TO WHOM IT MAY CONCERN:</p>

          <p style={styles.paragraph}>
            <strong>THIS IS TO CERTIFY</strong> that{" "}
            <ClickableField
              editor={editor}
              config={{
                key: "residentName",
                label: "Resident Name",
                scope: "fields",
              }}
              value={fields.residentName}
            >
              <strong>{fields.residentName.toUpperCase()}</strong>
            </ClickableField>
            , of legal age and resident of{" "}
            <ClickableField
              editor={editor}
              config={{
                key: "residentAddress",
                label: "Resident Address",
                scope: "fields",
              }}
              value={fields.residentAddress}
              style={styles.inlineEditable}
            >
              {fields.residentAddress}
            </ClickableField>
            .
          </p>

          <p style={styles.paragraph}>
            This is to certify further that the above-named person belongs to
            an indigent and low-income family as per record/assessment of this
            barangay.
          </p>

          <p style={styles.paragraph}>
            <strong>THIS CERTIFICATION</strong> is being issued upon the
            request of the above-named person for{" "}
            <ClickableField
              editor={editor}
              config={{ key: "purpose", label: "Purpose", scope: "fields" }}
              value={fields.purpose}
            >
              <strong>{fields.purpose.toUpperCase()}</strong>
            </ClickableField>
            .
          </p>

          <p style={styles.paragraph}>
            <strong>Issued</strong> this{" "}
            <ClickableField
              editor={editor}
              config={{
                key: "issuedDay",
                label: "Issued Day",
                scope: "fields",
              }}
              value={fields.issuedDay}
            >
              <strong>{fields.issuedDay}</strong>
            </ClickableField>{" "}
            day of{" "}
            <ClickableField
              editor={editor}
              config={{
                key: "issuedMonth",
                label: "Issued Month",
                scope: "fields",
              }}
              value={fields.issuedMonth}
            >
              <strong>{fields.issuedMonth}</strong>
            </ClickableField>
            ,{" "}
            <ClickableField
              editor={editor}
              config={{
                key: "issuedYear",
                label: "Issued Year",
                scope: "fields",
              }}
              value={fields.issuedYear}
            >
              <strong>{fields.issuedYear}</strong>
            </ClickableField>{" "}
            at{" "}
            <ClickableField
              editor={editor}
              config={{
                key: "issuedPlace",
                label: "Issued Place",
                scope: "fields",
              }}
              value={fields.issuedPlace}
              style={styles.inlineEditable}
            >
              {fields.issuedPlace}
            </ClickableField>
            .
          </p>

          <SignatureBlock
            name={org.punongBarangay}
            title={org.punongBarangayTitle}
            fieldEditor={editor}
          />

          <div style={styles.watermark}>🐢</div>

          <Footer org={org} fieldEditor={editor} />
        </div>
      </div>

      <EditFieldModal
        isOpen={editor.isOpen}
        config={editor.config}
        initialValue={editor.initialValue}
        onSave={editor.handleSave}
        onClose={editor.closeEditor}
      />

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        ${EXPORT_OVERRIDES}
      `}</style>
    </div>
  );
}