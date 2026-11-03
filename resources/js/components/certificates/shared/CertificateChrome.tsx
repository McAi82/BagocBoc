// src/components/certificates/shared/CertificateChrome.tsx

import React, { useState } from "react";
import type { RefObject } from "react";
import { styles } from "./certificateTheme";
import type { Organization, SBMember } from "./certificateTheme";
import type { useFieldEditor } from "./useFieldEditor";
import type { EditFieldConfig } from "./EditFieldModal";

export type FieldEditor = ReturnType<typeof useFieldEditor>;

// ---------- Clickable wrapper ----------
interface ClickableFieldProps {
  editor: FieldEditor;
  config: EditFieldConfig;
  value: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onDark?: boolean;
}

export function ClickableField({
  editor,
  config,
  value,
  style,
  children,
  onDark,
}: ClickableFieldProps) {
  const [hover, setHover] = useState(false);

  return (
    <span
      className="clickable-field"
      onClick={() => editor.openEditor(config, value)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...style,
        cursor: "pointer",
        borderRadius: 3,
        transition: "background 0.15s",
        background: hover
          ? onDark
            ? "rgba(255,255,255,0.18)"
            : "rgba(91,125,58,0.12)"
          : "transparent",
      }}
      title={`Click to edit ${config.label.toLowerCase()}`}
    >
      {children}
    </span>
  );
}

// ---------- Toolbar ----------
interface ToolbarProps {
  onDownload: () => void;
  exporting: boolean;
}

export function Toolbar({ onDownload, exporting }: ToolbarProps) {
  return (
    <div style={styles.toolbar} className="no-print">
      <div
        style={{
          ...styles.btn,
          background: "#f0f5ec",
          borderColor: "#5b7d3a",
          color: "#3f5a28",
          fontWeight: 600,
          cursor: "default",
        }}
      >
        Click any field to edit it
      </div>
      <button
        type="button"
        onClick={onDownload}
        disabled={exporting}
        style={{ ...styles.btn, ...styles.btnPrimary }}
      >
        {exporting ? "Preparing PDF…" : "Download as PDF"}
      </button>
    </div>
  );
}

// ---------- PDF export hook ----------
export function useDownloadPdf(
  certRef: RefObject<HTMLDivElement | null>,
  filenameBase: string,
) {
  const [exporting, setExporting] = useState(false);

  const handleDownload = async () => {
    if (!certRef.current) return;
    setExporting(true);

    const node = certRef.current;
    node.setAttribute("data-exporting", "true");

    try {
      if (document.fonts && (document.fonts as any).ready) {
        await (document.fonts as any).ready;
      }

      const [{ default: html2canvas }, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const jsPDF = (jsPDFModule as any).jsPDF || (jsPDFModule as any).default;

      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const canvas = await html2canvas(node, {
        scale: 4,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "letter",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const y = imgHeight < pageHeight ? (pageHeight - imgHeight) / 2 : 0;
      pdf.addImage(imgData, "PNG", 0, y, imgWidth, imgHeight);

      const safeName = (filenameBase || "certificate").replace(
        /[^a-z0-9]+/gi,
        "_",
      );
      pdf.save(`${safeName}.pdf`);
    } catch (err) {
      console.warn("PDF export failed, falling back to print():", err);
      window.print();
    } finally {
      node.removeAttribute("data-exporting");
      setExporting(false);
    }
  };

  return { exporting, handleDownload };
}

// ---------- Sidebar ----------
interface SidebarProps {
  org: Organization;
  fieldEditor: FieldEditor;
}

export function Sidebar({ org, fieldEditor }: SidebarProps) {
  return (
    <div style={styles.sidebar} data-sidebar="true">
      <div style={styles.sidebarHeaderWrap}>
        <ClickableField
          editor={fieldEditor}
          config={{ key: "councilName", label: "Council Name", scope: "org" }}
          value={org.councilName}
          style={styles.sidebarHeader}
          onDark
        >
          {org.councilName}
        </ClickableField>
      </div>

      <ClickableField
        editor={fieldEditor}
        config={{
          key: "punongBarangay",
          label: "Punong Barangay",
          scope: "org",
        }}
        value={org.punongBarangay}
        style={styles.sidebarPunong}
        onDark
      >
        {org.punongBarangay}
      </ClickableField>

      <div style={styles.sidebarPunongTitle}>{org.punongBarangayTitle}</div>

      <div style={styles.sidebarSectionLabel}>SB MEMBERS</div>

      {org.sbMembers.map((m: SBMember, i: number) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <ClickableField
            editor={fieldEditor}
            config={{
              key: `sbMember-${i}-name`,
              label: `SB Member ${i + 1} Name`,
              scope: "member",
              memberIndex: i,
              memberKey: "name",
            }}
            value={m.name}
            style={styles.sbName}
            onDark
          >
            {m.name}
          </ClickableField>
          <ClickableField
            editor={fieldEditor}
            config={{
              key: `sbMember-${i}-committee`,
              label: `SB Member ${i + 1} Committee`,
              scope: "member",
              memberIndex: i,
              memberKey: "committee",
              multiline: true,
            }}
            value={m.committee}
            style={styles.sbCommittee}
            onDark
          >
            [{m.committee}]
          </ClickableField>
        </div>
      ))}

      <div style={styles.sidebarDivider} />

      <div style={styles.sidebarSectionTitle}>VISION</div>
      <ClickableField
        editor={fieldEditor}
        config={{
          key: "vision",
          label: "Vision",
          scope: "org",
          multiline: true,
        }}
        value={org.vision}
        style={styles.sidebarBody}
        onDark
      >
        {org.vision}
      </ClickableField>

      <div style={styles.sidebarSectionTitle}>MISSION</div>
      <ClickableField
        editor={fieldEditor}
        config={{
          key: "mission1",
          label: "Mission 1",
          scope: "org",
          multiline: true,
        }}
        value={org.mission1}
        style={styles.sidebarBody}
        onDark
      >
        {org.mission1}
      </ClickableField>
      <div style={{ height: 8 }} />
      <ClickableField
        editor={fieldEditor}
        config={{
          key: "mission2",
          label: "Mission 2",
          scope: "org",
          multiline: true,
        }}
        value={org.mission2}
        style={styles.sidebarBody}
        onDark
      >
        {org.mission2}
      </ClickableField>
      <div style={{ height: 8 }} />
      <ClickableField
        editor={fieldEditor}
        config={{
          key: "mission3",
          label: "Mission 3",
          scope: "org",
          multiline: true,
        }}
        value={org.mission3}
        style={styles.sidebarBody}
        onDark
      >
        {org.mission3}
      </ClickableField>
    </div>
  );
}

// ---------- Letterhead ----------
interface LetterheadProps {
  org: Organization;
  fieldEditor: FieldEditor;
}

export function Letterhead({ org, fieldEditor }: LetterheadProps) {
  return (
    <>
      <div style={styles.mainHeader}>
        <div style={styles.sealPlaceholder}>Seal</div>
        <div style={styles.headerText}>
          <ClickableField
            editor={fieldEditor}
            config={{ key: "republic", label: "Republic", scope: "org" }}
            value={org.republic}
          >
            {org.republic}
          </ClickableField>
          <ClickableField
            editor={fieldEditor}
            config={{ key: "province", label: "Province", scope: "org" }}
            value={org.province}
          >
            {org.province}
          </ClickableField>
          <ClickableField
            editor={fieldEditor}
            config={{
              key: "municipality",
              label: "Municipality",
              scope: "org",
            }}
            value={org.municipality}
          >
            {org.municipality}
          </ClickableField>
          <ClickableField
            editor={fieldEditor}
            config={{ key: "barangay", label: "Barangay", scope: "org" }}
            value={org.barangay}
            style={{ fontWeight: 700 }}
          >
            {org.barangay}
          </ClickableField>
        </div>
        <div style={styles.sealPlaceholder}>Logo</div>
      </div>

      <ClickableField
        editor={fieldEditor}
        config={{ key: "officeTitle", label: "Office Title", scope: "org" }}
        value={org.officeTitle}
        style={styles.officeTitle}
      >
        {org.officeTitle}
      </ClickableField>
      <div style={styles.rule} />
    </>
  );
}

// ---------- Footer ----------
interface FooterProps {
  org: Organization;
  fieldEditor: FieldEditor;
}

export function Footer({ org, fieldEditor }: FooterProps) {
  return (
    <div style={styles.footer}>
      <ClickableField
        editor={fieldEditor}
        config={{ key: "address", label: "Barangay Address", scope: "org" }}
        value={org.address}
      >
        {org.address}
      </ClickableField>
      <div>
        Address:{" "}
        <ClickableField
          editor={fieldEditor}
          config={{
            key: "buildingAddress",
            label: "Building Address",
            scope: "org",
          }}
          value={org.buildingAddress}
          style={styles.link}
        >
          {org.buildingAddress}
        </ClickableField>
      </div>
      <div>
        Email:{" "}
        <ClickableField
          editor={fieldEditor}
          config={{ key: "email", label: "Email", scope: "org" }}
          value={org.email}
          style={styles.link}
        >
          {org.email}
        </ClickableField>
      </div>
      <div>
        Facebook Account:{" "}
        <ClickableField
          editor={fieldEditor}
          config={{ key: "facebook", label: "Facebook", scope: "org" }}
          value={org.facebook}
        >
          {org.facebook}
        </ClickableField>
      </div>
      <div>
        Contact Number:{" "}
        <ClickableField
          editor={fieldEditor}
          config={{
            key: "contactNumber",
            label: "Contact Number",
            scope: "org",
          }}
          value={org.contactNumber}
        >
          {org.contactNumber}
        </ClickableField>
      </div>
    </div>
  );
}

// ---------- Signature block ----------
interface SignatureBlockProps {
  name: string;
  title: string;
  fieldEditor: FieldEditor;
}

export function SignatureBlock({
  name,
  title,
  fieldEditor,
}: SignatureBlockProps) {
  return (
    <div style={styles.signatureBlock}>
      <ClickableField
        editor={fieldEditor}
        config={{
          key: "punongBarangay",
          label: "Punong Barangay",
          scope: "org",
        }}
        value={name}
        style={styles.signatureName}
      >
        {name.toUpperCase()}
      </ClickableField>
      <br />
      <ClickableField
        editor={fieldEditor}
        config={{
          key: "punongBarangayTitle",
          label: "Punong Barangay Title",
          scope: "org",
        }}
        value={title}
        style={styles.signatureTitle}
      >
        {title}
      </ClickableField>
    </div>
  );
}