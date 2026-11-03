// src/api/certificationApi.ts
import { api } from "./apiClient";

export async function uploadCertificationPdf(
  certificationId: number,
  pdfBlob: Blob,
  documentName?: string,
) {
  const formData = new FormData();
  formData.append(
    "pdf",
    pdfBlob,
    documentName || `certificate_${certificationId}.pdf`,
  );
  if (documentName) {
    formData.append("document_name", documentName);
  }

  const response = await api.post(
    `/web/certifications/${certificationId}/upload-pdf`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data;
}