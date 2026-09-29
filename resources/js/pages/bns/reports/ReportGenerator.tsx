// src/pages/bns/reports/ReportGenerator.tsx

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Printer,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "../../../api/apiClient";
import toast from "react-hot-toast";
import jsPDF from "jspdf";

interface Report {
  id: string;
  title: string;
  demographic: string;
  generated_at: string;
  status: "generated" | "pending" | "failed";
  file_url?: string;
  data?: any;
}

export default function ReportGenerator() {
  const navigate = useNavigate();
  const { reportId } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (reportId) {
      fetchReport(reportId);
    } else {
      navigate("/barangay-bagocboc/bns/reports");
    }
  }, [reportId]);

  const fetchReport = async (id: string) => {
    setIsLoading(true);
    try {
      console.log(`📊 Fetching report ${id}...`);
      const response = await api.get(`/web/bns/reports/${id}`);
      console.log("📦 Report response:", response.data);

      const reportData = response.data?.data || response.data;

      if (reportData) {
        setReport(reportData);

        if (reportData.reports && Array.isArray(reportData.reports)) {
          setAllReports(reportData.reports);
          const idx = reportData.reports.findIndex((r: any) => r.id === id);
          setCurrentIndex(idx >= 0 ? idx : 0);
        } else {
          setAllReports([reportData]);
          setCurrentIndex(0);
        }
      } else {
        toast.error("Report not found");
        navigate("/barangay-bagocboc/bns/reports");
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      toast.error("Failed to load report");
      navigate("/barangay-bagocboc/bns/reports");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Generate PDF content
  const generatePDFContent = (reportData: Report) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(26, 86, 219);
    doc.text("Barangay Bagocboc", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text(reportData.title, pageWidth / 2, 30, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    doc.text(
      `Generated on: ${new Date(reportData.generated_at).toLocaleString()}`,
      pageWidth / 2,
      38,
      { align: "center" },
    );

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 45, pageWidth - 20, 45);

    // Content
    let y = 55;
    doc.setFontSize(12);
    doc.setTextColor(51, 51, 51);

    if (reportData.data) {
      // Summary
      doc.setFontSize(14);
      doc.setTextColor(26, 86, 219);
      doc.text("Summary Statistics", 20, y);
      y += 10;

      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51);
      doc.text(`Total Records: ${reportData.data.total || 0}`, 20, y);
      y += 8;

      if (reportData.data.breakdown && reportData.data.breakdown.length > 0) {
        y += 5;
        doc.setFontSize(14);
        doc.setTextColor(26, 86, 219);
        doc.text("Breakdown", 20, y);
        y += 10;

        doc.setFontSize(11);
        doc.setTextColor(51, 51, 51);

        reportData.data.breakdown.forEach((item: any) => {
          const text = `${item.category}: ${item.count} (${item.percentage.toFixed(1)}%)`;
          doc.text(text, 20, y);
          y += 8;

          // Check if we need a new page
          if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
          }
        });
      }

      if (reportData.data.date_range) {
        y += 5;
        doc.setFontSize(11);
        doc.setTextColor(102, 102, 102);
        doc.text(
          `Date Range: ${reportData.data.date_range.from} - ${reportData.data.date_range.to}`,
          20,
          y,
        );
        y += 8;
      }
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(153, 153, 153);
    doc.text(
      "This is a system-generated report.",
      pageWidth / 2,
      pageHeight - 15,
      {
        align: "center",
      },
    );
    doc.text(
      "Barangay Bagocboc Management System",
      pageWidth / 2,
      pageHeight - 8,
      {
        align: "center",
      },
    );

    return doc;
  };

  // ✅ Download as PDF
  const handleDownloadPDF = () => {
    if (!report) {
      toast.error("No report to download");
      return;
    }

    setIsDownloading(true);
    try {
      const doc = generatePDFContent(report);
      const filename = `${report.title.replace(/\s+/g, "_")}.pdf`;
      doc.save(filename);
      toast.success("Report downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download report");
    } finally {
      setIsDownloading(false);
    }
  };

  // ✅ Download All Reports as PDF
  const handleDownloadAllPDF = () => {
    if (allReports.length === 0) {
      toast.error("No reports to download");
      return;
    }

    setIsDownloading(true);
    try {
      // Create a single PDF with all reports
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      allReports.forEach((reportData, index) => {
        if (index > 0) {
          doc.addPage();
        }

        // Header
        doc.setFontSize(18);
        doc.setTextColor(26, 86, 219);
        doc.text("Barangay Bagocboc", pageWidth / 2, 20, { align: "center" });

        doc.setFontSize(14);
        doc.setTextColor(51, 51, 51);
        doc.text(reportData.title, pageWidth / 2, 30, { align: "center" });

        doc.setFontSize(10);
        doc.setTextColor(102, 102, 102);
        doc.text(
          `Generated on: ${new Date(reportData.generated_at).toLocaleString()}`,
          pageWidth / 2,
          38,
          { align: "center" },
        );

        doc.setDrawColor(200, 200, 200);
        doc.line(20, 45, pageWidth - 20, 45);

        // Content
        let y = 55;
        doc.setFontSize(12);
        doc.setTextColor(51, 51, 51);

        if (reportData.data) {
          doc.setFontSize(14);
          doc.setTextColor(26, 86, 219);
          doc.text("Summary Statistics", 20, y);
          y += 10;

          doc.setFontSize(11);
          doc.setTextColor(51, 51, 51);
          doc.text(`Total Records: ${reportData.data.total || 0}`, 20, y);
          y += 8;

          if (
            reportData.data.breakdown &&
            reportData.data.breakdown.length > 0
          ) {
            y += 5;
            doc.setFontSize(14);
            doc.setTextColor(26, 86, 219);
            doc.text("Breakdown", 20, y);
            y += 10;

            doc.setFontSize(11);
            doc.setTextColor(51, 51, 51);

            reportData.data.breakdown.forEach((item: any) => {
              const text = `${item.category}: ${item.count} (${item.percentage.toFixed(1)}%)`;
              doc.text(text, 20, y);
              y += 8;
            });
          }
        }

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(153, 153, 153);
        doc.text(
          `Report ${index + 1} of ${allReports.length}`,
          pageWidth / 2,
          pageHeight - 15,
          { align: "center" },
        );
        doc.text(
          "Barangay Bagocboc Management System",
          pageWidth / 2,
          pageHeight - 8,
          {
            align: "center",
          },
        );
      });

      const filename = `All_BNS_Reports_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);
      toast.success(
        `All ${allReports.length} reports downloaded successfully!`,
      );
    } catch (error) {
      console.error("Error downloading all reports:", error);
      toast.error("Failed to download reports");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!report) return;
    setIsPrinting(true);
    try {
      const doc = generatePDFContent(report);
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const printWindow = window.open(pdfUrl, "_blank", "width=800,height=600");
      if (printWindow) {
        printWindow.addEventListener("load", () => {
          printWindow.print();
        });
      } else {
        toast.error("Please allow popups");
      }
    } catch (error) {
      console.error("Error printing:", error);
      toast.error("Failed to print report");
    } finally {
      setIsPrinting(false);
    }
  };

  const getDemographicLabel = (type: string): string => {
    const labels: Record<string, string> = {
      household: "Household",
      family: "Family",
      gender: "Gender",
      age: "Age Group",
      pregnant: "Pregnant",
      breastfeeding: "Breastfeeding",
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-theme-primary" />
          <h3 className="text-lg font-semibold text-theme-text">
            Loading Report...
          </h3>
          <p className="text-sm text-theme-textSecondary">
            Fetching report data
          </p>
          <div className="w-64 h-2 bg-theme-background rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full animate-pulse"
              style={{ width: "60%" }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-theme-textSecondary mb-4" />
        <h3 className="text-lg font-semibold text-theme-text">
          Report not found
        </h3>
        <p className="text-theme-textSecondary">
          The requested report does not exist.
        </p>
        <button
          onClick={() => navigate("/barangay-bagocboc/bns/reports")}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:opacity-90 transition-colors"
        >
          Back to Records
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/barangay-bagocboc/bns/reports")}
            className="p-2 rounded-lg hover:bg-theme-hover transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-theme-textSecondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-theme-text">
              {report.title}
            </h1>
            <p className="text-sm text-theme-textSecondary">
              {getDemographicLabel(report.demographic)} Report •
              {new Date(report.generated_at).toLocaleString()}
            </p>
            {allReports.length > 1 && (
              <p className="text-xs text-theme-primary">
                Report {currentIndex + 1} of {allReports.length}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Navigation between reports */}
          {allReports.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (currentIndex > 0) {
                    const prevReport = allReports[currentIndex - 1];
                    if (prevReport) {
                      navigate(
                        `/barangay-bagocboc/bns/reports/view/${prevReport.id}`,
                      );
                    }
                  }
                }}
                disabled={currentIndex === 0}
                className="p-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 text-theme-textSecondary" />
              </button>
              <button
                onClick={() => {
                  if (currentIndex < allReports.length - 1) {
                    const nextReport = allReports[currentIndex + 1];
                    if (nextReport) {
                      navigate(
                        `/barangay-bagocboc/bns/reports/view/${nextReport.id}`,
                      );
                    }
                  }
                }}
                disabled={currentIndex === allReports.length - 1}
                className="p-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4 text-theme-textSecondary" />
              </button>
            </div>
          )}

          {/* Print Button */}
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text disabled:opacity-50"
          >
            {isPrinting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            Print
          </button>

          {/* Download Current Report */}
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </button>

          {/* Download All Reports */}
          {allReports.length > 1 && (
            <button
              onClick={handleDownloadAllPDF}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Download All ({allReports.length})
            </button>
          )}
        </div>
      </div>

      {/* Success Message */}
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        <p className="text-sm text-green-700 dark:text-green-400">
          {allReports.length > 1
            ? `${allReports.length} reports generated successfully! You can navigate between them using the arrows.`
            : "Report generated successfully! You can print or download it."}
        </p>
      </div>

      {/* Report Preview */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <div className="bg-theme-background rounded-lg p-6 min-h-[400px]">
          <div className="space-y-4">
            {/* Report Header */}
            <div className="border-b border-theme pb-4 text-center">
              <h2 className="text-xl font-bold text-theme-text">
                Barangay Bagocboc
              </h2>
              <p className="text-sm text-theme-textSecondary">{report.title}</p>
              <p className="text-xs text-theme-textSecondary">
                Generated on {new Date(report.generated_at).toLocaleString()}
              </p>
            </div>

            {/* Report Content */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-theme-surface border border-theme rounded-lg">
                <p className="text-xs text-theme-textSecondary">Report Type</p>
                <p className="font-medium text-theme-text">{report.title}</p>
              </div>
              <div className="p-3 bg-theme-surface border border-theme rounded-lg">
                <p className="text-xs text-theme-textSecondary">Status</p>
                <p className="font-medium text-green-600 dark:text-green-400">
                  Generated
                </p>
              </div>
            </div>

            {/* Report Statistics */}
            {report.data && (
              <div className="p-4 bg-theme-surface border border-theme rounded-lg">
                <h4 className="font-medium text-theme-text mb-3">
                  Summary Statistics
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-theme-textSecondary">
                      Total Records
                    </span>
                    <span className="font-semibold text-theme-text">
                      {report.data.total || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-theme-textSecondary">Categories</span>
                    <span className="font-semibold text-theme-text">
                      {report.data.breakdown?.length || 0}
                    </span>
                  </div>
                  {report.data.date_range && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-theme-textSecondary">
                        Date Range
                      </span>
                      <span className="font-semibold text-theme-text">
                        {report.data.date_range.from} -{" "}
                        {report.data.date_range.to}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Breakdown */}
            {report.data?.breakdown && report.data.breakdown.length > 0 && (
              <div className="p-4 bg-theme-surface border border-theme rounded-lg">
                <h4 className="font-medium text-theme-text mb-3">Breakdown</h4>
                <div className="space-y-2">
                  {report.data.breakdown.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-theme-textSecondary">
                        {item.category}
                      </span>
                      <span className="font-semibold text-theme-text">
                        {item.count} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-theme pt-4 text-center text-xs text-theme-textSecondary">
              <p>Barangay Bagocboc - Health Information System</p>
              <p>Report ID: {report.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Status */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-theme-textSecondary">
          Status:{" "}
          <span className="text-green-600 dark:text-green-400 font-medium">
            Generated
          </span>
          {allReports.length > 1 && (
            <span className="ml-2 text-theme-primary">
              • {allReports.length} reports total
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/barangay-bagocboc/bns/reports")}
            className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            Back to Records
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isPrinting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            Print Report
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
