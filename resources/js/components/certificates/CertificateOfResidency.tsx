// src/components/certificates/CertificateOfResidency.tsx

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
  residentName: "Maria S. Dela Cruz",
  residentAge: "42",
  civilStatus: "Married",
  residentAddress: "Purok 1, Barangay Bagocboc, Opol, Misamis Oriental",
  residingSince: "2010",
  yearsResiding: "16",
  purpose: "VOTER'S REGISTRATION",
  issuedDay: "25th",
  issuedMonth: "September",
  issuedYear: "2026",
  issuedPlace: "Barangay Bagocboc, Opol, Misamis Oriental",
};

export default function CertificateOfResidency({
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
    `Certificate_of_Residency_${fields.residentName}`,
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

          <h1 style={styles.certTitle}>CERTIFICATE OF RESIDENCY</h1>

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
            ,{" "}
            <ClickableField
              editor={editor}
              config={{
                key: "residentAge",
                label: "Resident Age",
                scope: "fields",
              }}
              value={fields.residentAge}
              style={styles.inlineEditable}
            >
              {fields.residentAge}
            </ClickableField>{" "}
            years old,{" "}
            <ClickableField
              editor={editor}
              config={{
                key: "civilStatus",
                label: "Civil Status",
                scope: "fields",
              }}
              value={fields.civilStatus}
              style={styles.inlineEditable}
            >
              {fields.civilStatus}
            </ClickableField>
            , is a bona fide resident of{" "}
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
            This is to certify further that, as per record of this barangay, the
            above-named person has been actually and continuously residing at
            the said address since{" "}
            <ClickableField
              editor={editor}
              config={{
                key: "residingSince",
                label: "Residing Since",
                scope: "fields",
              }}
              value={fields.residingSince}
            >
              <strong>{fields.residingSince}</strong>
            </ClickableField>
            , or for{" "}
            <ClickableField
              editor={editor}
              config={{
                key: "yearsResiding",
                label: "Years Residing",
                scope: "fields",
              }}
              value={fields.yearsResiding}
            >
              <strong>{fields.yearsResiding}</strong>
            </ClickableField>{" "}
            years to date.
          </p>

          <p style={styles.paragraph}>
            This <strong>CERTIFICATION</strong> is being issued upon the
            request of the above-named person for{" "}
            <ClickableField
              editor={editor}
              config={{ key: "purpose", label: "Purpose", scope: "fields" }}
              value={fields.purpose}
            >
              <strong>{fields.purpose.toUpperCase()}</strong>
            </ClickableField>{" "}
            and for whatever legal purpose it may serve.
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