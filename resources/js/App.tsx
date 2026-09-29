// src/App.tsx

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "./components/core/ThemeProvider";
import Layout from "./components/core/Layout";
import ProtectedRoute from "./components/core/ProtectedRoute";
import BNSRecordDetails from "./pages/bns/reports/BNSRecordDetails";

// ============================================
// AUTH PAGES
// ============================================
import Login from "./pages/auth/Login";
import OtpVerification from "./pages/auth/OtpVerification";
import CreateNewPassword from "./pages/auth/CreateNewPassword";

// ============================================
// DASHBOARD PAGES
// ============================================
import DashboardIndex from "./pages/dashboards/DashboardIndex";
import FrontDeskDashboard from "./pages/dashboards/FrontDeskDashboard";
import SecretaryDashboard from "./pages/dashboards/SecretaryDashboard";
import SystemOverview from "./pages/dashboards/SystemOverview";
import TreasurerDashboard from "./pages/dashboards/TreasurerDashboard";

// ============================================
// CAPTAIN PAGES
// ============================================
import CaptainDashboard from "./pages/captain/CaptainDashboard";

import {
    HealthDashboard,
    PatientRecords,
    PatientDetails,
    PatientRecordForm,
    PregnantRecords,
    ChildrenRecords,
    LactatingRecords,
    SeniorRecords,
    NcdRecords,
    CheckupHistory,
    CheckupForm,
    PatientSearch,
    PatientRegistration,
} from "./pages/health";

// ============================================
// FRONT DESK PAGES
// ============================================
import FrontDeskQueuePage from "./pages/frontdesk/FrontDeskQueuePage";
import FrontDeskRequestsPage from "./pages/frontdesk/FrontDeskRequestsPage";
import FrontDeskAppointmentsPage from "./pages/frontdesk/FrontDeskAppointmentsPage";
import FrontDeskResidentsPage from "./pages/frontdesk/FrontDeskResidentsPage";
import FrontDeskClaimSlipsPage from "./pages/frontdesk/FrontDeskClaimSlipsPage";
import FrontDeskTaxPage from "./pages/frontdesk/FrontDeskTaxPage";

// ============================================
// RESIDENTS & HOUSEHOLDS
// ============================================
import Residents from "./pages/residents/Residents";
import ResidentProfile from "./pages/residents/ResidentProfile";
import RegistrationForm from "./pages/residents/RegistrationForm";
import ResidentConfirmation from "./pages/residents/ResidentConfirmation";
import Households from "./pages/households/Households";
import HouseholdProfile from "./pages/households/HouseholdProfile";

// ============================================
// CERTIFICATIONS & CLEARANCE
// ============================================
import Certifications from "./pages/certificates/Certifications";
import Clearance from "./pages/clearance/Clearance";

// ============================================
// FINANCIAL PAGES
// ============================================
import Payments from "./pages/financial/Payments";
import FinancialReports from "./pages/financial/FinancialReports";

// ============================================
// SECRETARY PAGES
// ============================================
import SecretaryRegistry from "./pages/secretary/SecretaryRegistry";
import ClearanceLog from "./pages/secretary/ClearanceLog";
import CertificateReports from "./pages/secretary/CertificateReports";

// ============================================
// BNS PAGES
// ============================================
import BNSDashboard from "./pages/bns/BNSDashboard";
import CollectedRecords from "./pages/bns/reports/CollectedRecords";
import DemographicConsolidation from "./pages/bns/reports/DemographicConsolidation";
import ReportGenerator from "./pages/bns/reports/ReportGenerator";
import GISMap from "./pages/bns/gis/GISMap";

// ============================================
// SETTINGS PAGES
// ============================================
import Settings from "./pages/settings/Settings";
import ProfileSettings from "./pages/settings/ProfileSettings";
import SystemSettings from "./pages/settings/SystemSettings";

// ============================================
// ANNOUNCEMENTS
// ============================================
import Announcements from "./pages/announcements/Announcements";

// ============================================
// MAP VIEW
// ============================================
import MapView from "./pages/MapView";

// ============================================
// NOT FOUND
// ============================================
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000,
        },
    },
});

function App() {
    const HEALTH_ROLES = ["Midwife", "Nurse Deployment Program", "Super Admin"];

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <BrowserRouter>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: "var(--theme-surface)",
                                color: "var(--theme-text)",
                                border: "1px solid var(--theme-border)",
                            },
                        }}
                    />
                    <Routes>
                        {/* ============================================ */}
                        {/* PUBLIC ROUTES */}
                        {/* ============================================ */}
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/otp" element={<OtpVerification />} />
                        <Route path="/create-password" element={<CreateNewPassword />} />

                        {/* ============================================ */}
                        {/* PROTECTED ROUTES */}
                        {/* ============================================ */}
                        <Route
                            path="/barangay-bagocboc"
                            element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            {/* Dashboard Index - Redirects based on role */}
                            <Route index element={<DashboardIndex />} />

                            {/* ============================================ */}
                            {/* SUPER ADMIN ROUTES */}
                            {/* ============================================ */}
                            <Route
                                path="superadmin"
                                element={
                                    <ProtectedRoute allowedRoles={["Super Admin"]}>
                                        <SystemOverview />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* CAPTAIN ROUTES */}
                            {/* ============================================ */}
                            <Route
                                path="captain"
                                element={
                                    <ProtectedRoute allowedRoles={["Barangay Captain"]}>
                                        <CaptainDashboard />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* SECRETARY ROUTES */}
                            {/* ============================================ */}
                            <Route
                                path="secretary"
                                element={
                                    <ProtectedRoute allowedRoles={["Barangay Secretary"]}>
                                        <SecretaryDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="secretary/registry"
                                element={
                                    <ProtectedRoute allowedRoles={["Barangay Secretary"]}>
                                        <SecretaryRegistry />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="secretary/clearance-log"
                                element={
                                    <ProtectedRoute allowedRoles={["Barangay Secretary"]}>
                                        <ClearanceLog />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="secretary/certificate-reports"
                                element={
                                    <ProtectedRoute allowedRoles={["Barangay Secretary"]}>
                                        <CertificateReports />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* TREASURER ROUTES */}
                            {/* ============================================ */}
                            <Route
                                path="treasurer"
                                element={
                                    <ProtectedRoute allowedRoles={["Barangay Treasurer"]}>
                                        <TreasurerDashboard />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* FRONT DESK ROUTES */}
                            {/* ============================================ */}
                            <Route
                                path="frontdesk"
                                element={
                                    <ProtectedRoute allowedRoles={["Front Desk Clerk"]}>
                                        <FrontDeskDashboard />
                                    </ProtectedRoute>
                                }
                            >
                                <Route index element={<Navigate to="queue" replace />} />
                                <Route path="queue" element={<FrontDeskQueuePage />} />
                                <Route path="requests" element={<FrontDeskRequestsPage />} />
                                <Route
                                    path="appointments"
                                    element={<FrontDeskAppointmentsPage />}
                                />
                                <Route path="residents" element={<FrontDeskResidentsPage />} />
                                <Route path="claims" element={<FrontDeskClaimSlipsPage />} />
                                <Route path="tax" element={<FrontDeskTaxPage />} />
                            </Route>

                            {/* ============================================ */}
                            {/* HEALTH ROUTES */}
                            {/* ============================================ */}
                            <Route
                                path="health"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <HealthDashboard />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="health/records"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <PatientRecords />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="health/records/:id"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <PatientDetails />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="health/records/pregnant"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <PregnantRecords />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="health/records/children"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <ChildrenRecords />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="health/records/lactating"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <LactatingRecords />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="health/records/senior"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <SeniorRecords />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="health/records/other"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <NcdRecords />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="health/patients/new"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <PatientRegistration />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="health/patients/new-form"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <PatientRecordForm />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="health/patients/search"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <PatientSearch />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="health/checkups"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <CheckupHistory />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="health/checkups/new/:patientId"
                                element={
                                    <ProtectedRoute allowedRoles={HEALTH_ROLES}>
                                        <CheckupForm />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* BNS ROUTES */}
                            {/* ============================================ */}
                            <Route
                                path="bns"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["Barangay Nutrition Scholar", "Super Admin"]}
                                    >
                                        <BNSDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="bns/reports"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["Barangay Nutrition Scholar", "Super Admin"]}
                                    >
                                        <CollectedRecords />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="bns/reports/consolidate/:type"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["Barangay Nutrition Scholar", "Super Admin"]}
                                    >
                                        <DemographicConsolidation />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="bns/reports/generate"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["Barangay Nutrition Scholar", "Super Admin"]}
                                    >
                                        <ReportGenerator />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="bns/reports/records/:id"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["Barangay Nutrition Scholar", "Super Admin"]}
                                    >
                                        <BNSRecordDetails />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="bns/gis"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["Barangay Nutrition Scholar", "Super Admin"]}
                                    >
                                        <GISMap />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* RESIDENTS ROUTES */}
                            {/* ============================================ */}
                            <Route
                                path="populations/residents"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={[
                                            "Barangay Captain",
                                            "Barangay Secretary",
                                            "Super Admin",
                                        ]}
                                    >
                                        <Residents />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="residents/new"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={[
                                            "Barangay Captain",
                                            "Barangay Secretary",
                                            "Super Admin",
                                        ]}
                                    >
                                        <RegistrationForm />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="residents/:id"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={[
                                            "Barangay Captain",
                                            "Barangay Secretary",
                                            "Super Admin",
                                        ]}
                                    >
                                        <ResidentProfile />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="resident-confirmations"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={[
                                            "Barangay Secretary",
                                            "Front Desk Clerk",
                                            "Zone Leader",
                                            "Super Admin",
                                        ]}
                                    >
                                        <ResidentConfirmation />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* HOUSEHOLDS ROUTES */}
                            {/* ============================================ */}
                            <Route
                                path="populations/households"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={[
                                            "Barangay Captain",
                                            "Barangay Secretary",
                                            "Super Admin",
                                        ]}
                                    >
                                        <Households />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="households/:id"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={[
                                            "Barangay Captain",
                                            "Barangay Secretary",
                                            "Super Admin",
                                        ]}
                                    >
                                        <HouseholdProfile />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* CERTIFICATIONS & CLEARANCE */}
                            {/* ============================================ */}
                            <Route
                                path="certifications"
                                element={
                                    <ProtectedRoute allowedRoles={["Barangay Secretary"]}>
                                        <Certifications />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="clearance"
                                element={
                                    <ProtectedRoute allowedRoles={["Barangay Secretary"]}>
                                        <Clearance />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* FINANCIAL ROUTES */}
                            {/* ============================================ */}
                            <Route
                                path="payments"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["Barangay Secretary", "Barangay Treasurer"]}
                                    >
                                        <Payments />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="financial-reports"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={[
                                            "Barangay Secretary",
                                            "Barangay Treasurer",
                                            "Barangay Captain",
                                            "Super Admin",
                                        ]}
                                    >
                                        <FinancialReports />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* ANNOUNCEMENTS */}
                            {/* ============================================ */}
                            <Route
                                path="announcements"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["Barangay Captain", "Barangay Secretary"]}
                                    >
                                        <Announcements />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* MAP VIEW */}
                            {/* ============================================ */}
                            <Route
                                path="map"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["Barangay Captain", "Super Admin"]}
                                    >
                                        <MapView />
                                    </ProtectedRoute>
                                }
                            />

                            {/* ============================================ */}
                            {/* SETTINGS ROUTES */}
                            {/* ============================================ */}
                            <Route
                                path="settings"
                                element={
                                    <ProtectedRoute
                                        allowedRoles={["Super Admin", "Barangay Captain"]}
                                    >
                                        <Settings />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="settings/profile"
                                element={
                                    <ProtectedRoute>
                                        <ProfileSettings />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="settings/system"
                                element={
                                    <ProtectedRoute allowedRoles={["Super Admin"]}>
                                        <SystemSettings />
                                    </ProtectedRoute>
                                }
                            />
                        </Route>

                        {/* ============================================ */}
                        {/* 404 NOT FOUND */}
                        {/* ============================================ */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </ThemeProvider>
        </QueryClientProvider>
    );
}

export default App;