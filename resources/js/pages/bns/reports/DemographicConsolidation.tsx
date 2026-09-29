// src/pages/bns/reports/DemographicConsolidation.tsx

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Home,
  BarChart3,
  PieChart,
  TrendingUp,
  FileText,
  Printer,
  Download,
  Loader2,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { api } from "../../../api/apiClient";
import toast from "react-hot-toast";
import jsPDF from "jspdf";

const DEMOGRAPHIC_LABELS: Record<string, string> = {
  household: "Household",
  family: "Family",
  gender: "Gender",
  age: "Age Group",
  pregnant: "Pregnant",
  breastfeeding: "Breastfeeding",
};

const DEMOGRAPHIC_ICONS: Record<string, any> = {
  household: Home,
  family: Users,
  gender: Users,
  age: BarChart3,
  pregnant: TrendingUp,
  breastfeeding: TrendingUp,
};

interface ConsolidatedData {
  demographic: string;
  total: number;
  breakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  date_range: {
    from: string;
    to: string;
  };
  metadata: {
    generated_at: string;
    source: string;
  };
}

export default function DemographicConsolidation() {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (type) {
      fetchConsolidatedData(type);
    }
  }, [type]);

  const fetchConsolidatedData = async (demographicType: string) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/web/bns/consolidate/${demographicType}`);
      setData(response.data?.data || null);
    } catch (error) {
      console.error("Error fetching consolidated data:", error);
      toast.error("Failed to load consolidated data");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Generate PDF for consolidated data
  const generatePDF = (dataToExport: ConsolidatedData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(26, 86, 219);
    doc.text("Barangay Bagocboc", pageWidth / 2, 20, { align: "center" });

    const label =
      DEMOGRAPHIC_LABELS[dataToExport.demographic] || dataToExport.demographic;
    doc.setFontSize(14);
    doc.setTextColor(51, 51, 51);
    doc.text(`${label} Consolidation Report`, pageWidth / 2, 30, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    doc.text(
      `Generated on: ${new Date(dataToExport.metadata.generated_at).toLocaleString()}`,
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

    // Summary
    doc.setFontSize(14);
    doc.setTextColor(26, 86, 219);
    doc.text("Summary", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setTextColor(51, 51, 51);
    doc.text(`Total Records: ${dataToExport.total}`, 20, y);
    y += 8;
    doc.text(`Categories: ${dataToExport.breakdown.length}`, 20, y);
    y += 8;

    if (dataToExport.date_range) {
      doc.text(
        `Date Range: ${dataToExport.date_range.from} - ${dataToExport.date_range.to}`,
        20,
        y,
      );
      y += 8;
    }

    y += 5;

    // Breakdown
    if (dataToExport.breakdown && dataToExport.breakdown.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(26, 86, 219);
      doc.text("Breakdown", 20, y);
      y += 10;

      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51);

      dataToExport.breakdown.forEach((item: any) => {
        const text = `${item.category}: ${item.count} (${item.percentage.toFixed(1)}%)`;
        doc.text(text, 20, y);
        y += 8;

        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }
      });
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

  // ✅ Download as PDF (stays on same page)
  const handleDownloadPDF = () => {
    if (!data) {
      toast.error("No data to download");
      return;
    }

    setIsDownloading(true);
    try {
      const doc = generatePDF(data);
      const filename = `${DEMOGRAPHIC_LABELS[data.demographic] || data.demographic}_Consolidation.pdf`;
      doc.save(filename);
      toast.success("Report downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download report");
    } finally {
      setIsDownloading(false);
    }
  };

  // ✅ Print
  const handlePrint = () => {
    if (!data) {
      toast.error("No data to print");
      return;
    }

    try {
      const doc = generatePDF(data);
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
    }
  };

  // ✅ Generate Report (stays on same page and downloads PDF)
  const handleGenerateReport = async (all: boolean) => {
    setIsGenerating(true);
    try {
      const response = await api.post("/web/bns/reports/generate", {
        demographic: all ? "all" : type,
        generate_all: all,
      });

      if (response.data?.success) {
        if (all) {
          // Generate all reports - create combined PDF
          const reports = response.data?.data?.reports || [];
          if (reports.length === 0) {
            toast.error("No reports generated");
            return;
          }

          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();

          reports.forEach((report: any, index: number) => {
            if (index > 0) doc.addPage();

            const label =
              DEMOGRAPHIC_LABELS[report.demographic] || report.demographic;

            doc.setFontSize(18);
            doc.setTextColor(26, 86, 219);
            doc.text("Barangay Bagocboc", pageWidth / 2, 20, {
              align: "center",
            });

            doc.setFontSize(14);
            doc.setTextColor(51, 51, 51);
            doc.text(`${label} Consolidation Report`, pageWidth / 2, 30, {
              align: "center",
            });

            doc.setFontSize(10);
            doc.setTextColor(102, 102, 102);
            doc.text(
              `Generated on: ${new Date().toLocaleString()}`,
              pageWidth / 2,
              38,
              { align: "center" },
            );

            doc.setDrawColor(200, 200, 200);
            doc.line(20, 45, pageWidth - 20, 45);

            let y = 55;
            doc.setFontSize(12);
            doc.setTextColor(51, 51, 51);

            if (report.data) {
              doc.setFontSize(14);
              doc.setTextColor(26, 86, 219);
              doc.text("Summary", 20, y);
              y += 10;

              doc.setFontSize(11);
              doc.setTextColor(51, 51, 51);
              doc.text(`Total Records: ${report.data.total || 0}`, 20, y);
              y += 8;

              if (report.data.breakdown && report.data.breakdown.length > 0) {
                y += 5;
                doc.setFontSize(14);
                doc.setTextColor(26, 86, 219);
                doc.text("Breakdown", 20, y);
                y += 10;

                doc.setFontSize(11);
                doc.setTextColor(51, 51, 51);

                report.data.breakdown.forEach((item: any) => {
                  const text = `${item.category}: ${item.count} (${item.percentage.toFixed(1)}%)`;
                  doc.text(text, 20, y);
                  y += 8;
                });
              }
            }

            doc.setFontSize(9);
            doc.setTextColor(153, 153, 153);
            doc.text(
              `Report ${index + 1} of ${reports.length}`,
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
            `All ${reports.length} reports downloaded successfully!`,
          );
        } else {
          // Single report - use the data we already have
          if (data) {
            const doc = generatePDF(data);
            const filename = `${DEMOGRAPHIC_LABELS[data.demographic] || data.demographic}_Consolidation.pdf`;
            doc.save(filename);
            toast.success("Report downloaded successfully!");
          } else {
            toast.error("No data to generate report");
          }
        }
      } else {
        toast.error(response.data?.message || "Failed to generate report");
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const getDemographicIcon = (type: string) => {
    const Icon = DEMOGRAPHIC_ICONS[type] || PieChart;
    return Icon;
  };

  const getDemographicLabel = (type: string) => {
    return (
      DEMOGRAPHIC_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1)
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
          <p className="text-sm text-theme-textSecondary">
            Consolidating data...
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <PieChart className="w-12 h-12 mx-auto text-theme-textSecondary mb-4" />
        <h3 className="text-lg font-semibold text-theme-text">
          No data available
        </h3>
        <p className="text-theme-textSecondary">
          No consolidated data found for this demographic.
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

  const Icon = getDemographicIcon(type || "");
  const label = getDemographicLabel(type || "");

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
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-text">
                  {label} Consolidation
                </h1>
                <p className="text-sm text-theme-textSecondary">
                  {data.total} total records • {data.date_range.from} to{" "}
                  {data.date_range.to}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
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
          {/* ✅ Generate Report - Downloads PDF directly */}
          <button
            onClick={() => handleGenerateReport(false)}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Generate Report
          </button>
          {/* ✅ Generate All - Downloads PDF directly */}
          <button
            onClick={() => handleGenerateReport(true)}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Generate All
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-theme-surface border border-theme rounded-xl p-4">
          <p className="text-sm text-theme-textSecondary">Total Records</p>
          <p className="text-2xl font-bold text-theme-text">{data.total}</p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4">
          <p className="text-sm text-theme-textSecondary">Categories</p>
          <p className="text-2xl font-bold text-theme-text">
            {data.breakdown.length}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4">
          <p className="text-sm text-theme-textSecondary">Highest Category</p>
          <p className="text-lg font-semibold text-theme-text">
            {data.breakdown.sort((a, b) => b.count - a.count)[0]?.category ||
              "N/A"}
          </p>
        </div>
        <div className="bg-theme-surface border border-theme rounded-xl p-4">
          <p className="text-sm text-theme-textSecondary">Generated</p>
          <p className="text-sm font-medium text-theme-text">
            {new Date(data.metadata.generated_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-theme-surface border border-theme rounded-xl p-6">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-semibold text-theme-text">Detailed Breakdown</h3>
          {showBreakdown ? (
            <ChevronUp className="w-5 h-5 text-theme-textSecondary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-theme-textSecondary" />
          )}
        </button>

        {showBreakdown && (
          <div className="mt-4 space-y-4">
            {data.breakdown.map((item, index) => {
              const percentage = item.percentage.toFixed(1);
              const color =
                index === 0
                  ? "bg-blue-500"
                  : index === 1
                    ? "bg-green-500"
                    : index === 2
                      ? "bg-amber-500"
                      : "bg-purple-500";

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-theme-text">{item.category}</span>
                    <span className="text-theme-textSecondary">
                      {item.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-theme-background rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="mt-4 pt-4 border-t border-theme">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-theme-text">Total</span>
                <span className="text-theme-text">{data.total}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-theme">
        <div className="text-sm text-theme-textSecondary">
          <CheckCircle className="w-4 h-4 inline text-green-500 mr-1" />
          Data consolidated successfully
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate("/barangay-bagocboc/bns/reports")}
            className="px-4 py-2 border border-theme rounded-lg hover:bg-theme-hover transition-colors text-theme-text"
          >
            Back
          </button>
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
          <button
            onClick={() => handleGenerateReport(false)}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Generate Report
          </button>
          <button
            onClick={() => handleGenerateReport(true)}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Generate All
          </button>
        </div>
      </div>
    </div>
  );
}
