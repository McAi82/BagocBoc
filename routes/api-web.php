<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Web\Auth\AuthController;
use App\Http\Controllers\Web\Auth\AccountActivationController;
use App\Http\Controllers\Web\Dashboard\DashboardController;
use App\Http\Controllers\Web\Dashboard\SystemOverviewController;
use App\Http\Controllers\Web\Residents\ResidentController;
use App\Http\Controllers\Web\Households\HouseholdController;
use App\Http\Controllers\Web\Households\HouseholdCensusController;
use App\Http\Controllers\Web\Households\HouseholdInfoController;
use App\Http\Controllers\Web\Certifications\CertificationController;
use App\Http\Controllers\Web\Clearance\ClearanceController;
use App\Http\Controllers\Web\Financial\PaymentController;
use App\Http\Controllers\Web\Financial\TaxController;
use App\Http\Controllers\Web\Financial\FinancialReportController;
use App\Http\Controllers\Web\Financial\TransactionController;
use App\Http\Controllers\Web\Financial\PenaltyController;
use App\Http\Controllers\Web\FrontDesk\FrontDeskController;
use App\Http\Controllers\Web\Announcements\AnnouncementController;
use App\Http\Controllers\Web\Settings\UserController;
use App\Http\Controllers\Web\Settings\RoleController;
use App\Http\Controllers\Web\Settings\BarangayInfoController;
use App\Http\Controllers\Web\Settings\BarangayZoneController;
use App\Http\Controllers\Web\Settings\AdminUserController;
use App\Http\Controllers\Web\Settings\PersonnelController;
use App\Http\Controllers\Web\Print\PrintController;
use App\Http\Controllers\Web\Records\RecordActivityLogController;
use App\Http\Controllers\Web\Records\RecordsController;
use App\Http\Controllers\Web\Geo\HouseGeotagController;
use App\Http\Controllers\Web\Notifications\NotificationController;
use App\Http\Controllers\Web\Health\PatientController;
use App\Http\Controllers\Web\Health\HealthStatsController;
use App\Http\Controllers\Web\Residents\ResidentConfirmationController;
use App\Http\Controllers\Web\BNS\BNSController;
use App\Http\Controllers\Web\Captain\CaptainReportController;
use App\Http\Controllers\Mobile\Certificates\CertificateDownloadController;
use App\Http\Controllers\Web\Health\HealthReportsController;
use App\Models\Household;

Route::get(
    '/certificates/download/{token}',
    [CertificateDownloadController::class, 'download']
)->name('certificates.download.one_time');

Route::post('/{id}/reissue', [CertificationController::class, 'reissue']);

Route::get('/verify/{householdNumber}', function ($householdNumber) {
    $household = Household::with([
        'address.barangayZone',
        'residents' => function ($q) {
            $q->orderBy('resident_households.is_primary', 'desc');
        },
        'censusRecords' => function ($q) {
            $q->latest()->limit(1);
        },
    ])
        ->where('household_number', $householdNumber)
        ->orWhere('household_tracking_number', $householdNumber)
        ->first();

    if (!$household) {
        return view('verify.not-found', ['number' => $householdNumber]);
    }

    return view('verify.household', ['household' => $household]);
})->name('household.verify');

/*
|--------------------------------------------------------------------------
| Web API Routes (api-web)
|--------------------------------------------------------------------------
| All routes are prefixed with /api/web
| Protected by auth:sanctum and web.access middleware
| ⚠️ IMPORTANT: Static routes MUST be defined BEFORE wildcard routes
*/

// ============================================
// 1. PUBLIC AUTH ROUTES (No auth middleware)
// ============================================

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/check-email', [AuthController::class, 'checkEmail']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// ============================================
// 2. ACCOUNT ACTIVATION (Public)
// ============================================

Route::post('/account-activation/verify', [AccountActivationController::class, 'verifyRecords']);
Route::post('/account-activation/request', [AccountActivationController::class, 'store']);

// ============================================
// 3. PROTECTED WEB ROUTES (auth:sanctum + web.access)
// ============================================

Route::middleware(['auth:sanctum', 'web.access'])->group(function () {

    Route::post('/{id}/generate-pdf-server', [CertificationController::class, 'generatePdfServer']);

    // ============================================
    // 3.1 USER & AUTH
    // ============================================
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // ============================================
    // 3.2 DASHBOARD
    // ============================================
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/system/overview', [SystemOverviewController::class, 'index']);
    Route::get('/system/logs', [SystemOverviewController::class, 'logs']);

    // ============================================
    // 3.3 USERS & ROLES
    // ============================================
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
    Route::post('/users/{id}/toggle-status', [UserController::class, 'toggleStatus']);

    Route::get('/roles', [RoleController::class, 'index']);
    Route::get('/roles/{id}', [RoleController::class, 'show']);
    Route::post('/roles', [RoleController::class, 'store']);
    Route::put('/roles/{id}', [RoleController::class, 'update']);
    Route::delete('/roles/{id}', [RoleController::class, 'destroy']);

    // ============================================
    // 3.4 RESIDENTS
    // ============================================
    // NOTE: "/residents/encoder/{userId}" must come before "/residents/{id}"
    // or the {id} wildcard will swallow the literal "encoder" segment.
    Route::get('/residents', [ResidentController::class, 'index']);
    Route::get('/residents/encoder/{userId}', [ResidentController::class, 'getByEncoder']);
    Route::get('/residents/{id}', [ResidentController::class, 'show']);
    Route::post('/residents', [ResidentController::class, 'store']);
    Route::put('/residents/{id}', [ResidentController::class, 'update']);
    Route::delete('/residents/{id}', [ResidentController::class, 'destroy']);

    // ============================================
    // 3.5 RESIDENT CONFIRMATIONS
    // ============================================
    // NOTE: "my-pending" and "resident/{residentId}" must come before
    // "/{id}" or they'll be swallowed by the wildcard.
    Route::get('/resident-confirmations', [ResidentConfirmationController::class, 'index']);
    Route::post('/resident-confirmations', [ResidentConfirmationController::class, 'store']);
    Route::get('/resident-confirmations/my-pending', [ResidentConfirmationController::class, 'myPending']);
    Route::get('/resident-confirmations/resident/{residentId}', [ResidentConfirmationController::class, 'getByResident']);
    Route::get('/resident-confirmations/{id}', [ResidentConfirmationController::class, 'show']);
    Route::post('/resident-confirmations/{id}/confirm', [ResidentConfirmationController::class, 'confirm']);
    Route::post('/resident-confirmations/{id}/reject', [ResidentConfirmationController::class, 'reject']);

    // ============================================
    // 3.6 HOUSEHOLDS
    // ============================================
    Route::get('/households', [HouseholdController::class, 'index']);
    Route::get('/households/{id}', [HouseholdController::class, 'show']);
    Route::post('/households', [HouseholdController::class, 'store']);
    Route::put('/households/{id}', [HouseholdController::class, 'update']);
    Route::delete('/households/{id}', [HouseholdController::class, 'destroy']);

    // NOTE: "/households-info/encoder/{userId}" must come before
    // "/households-info/{id}" for the same reason as above.
    Route::get('/households-info', [HouseholdInfoController::class, 'index']);
    Route::get('/households-info/encoder/{userId}', [HouseholdInfoController::class, 'getByEncoder']);
    Route::get('/households-info/{id}', [HouseholdInfoController::class, 'show']);

    Route::post('/census/record', [HouseholdCensusController::class, 'store']);
    Route::get('/census/records', [HouseholdCensusController::class, 'index']);
    Route::get('/census/records/{id}', [HouseholdCensusController::class, 'show']);

    // ============================================
    // CAPTAIN
    // ============================================
    Route::prefix('/captain')->group(function () {
        // ✅ Send report to Captain (POST - Secretary sends reports)
        Route::post('/reports/send', [CaptainReportController::class, 'sendToCaptain']);

        // ✅ Get reports (GET - Captain views reports)
        Route::get('/reports', [CaptainReportController::class, 'getReports']);
        Route::get('/reports/stats', [CaptainReportController::class, 'getStats']);
        Route::get('/reports/pending-count', [CaptainReportController::class, 'pendingCount']);

        // ✅ Approve/Reject (POST - Captain actions)
        Route::post('/reports/{id}/approve', [CaptainReportController::class, 'approve']);
        Route::post('/reports/{id}/reject', [CaptainReportController::class, 'reject']);
    });

    // ============================================
    // 3.7 CERTIFICATIONS
    // ============================================
    // NOTE: "/types", "/types/all", "/stats" must come before "/{id}"
    Route::prefix('/certifications')->group(function () {
        // Static routes FIRST
        Route::get('/', [CertificationController::class, 'index']);
        Route::post('/', [CertificationController::class, 'store']);
        Route::get('/types', [CertificationController::class, 'types']);
        Route::get('/types/all', [CertificationController::class, 'allTypes']);
        Route::post('/types', [CertificationController::class, 'storeType']);
        Route::put('/types/{id}', [CertificationController::class, 'updateType']);
        Route::delete('/types/{id}', [CertificationController::class, 'deleteType']);

        // Wildcard routes AFTER static
        Route::get('/{id}', [CertificationController::class, 'show']);
        Route::post('/{id}/approve', [CertificationController::class, 'approve']);
        Route::post('/{id}/reject', [CertificationController::class, 'reject']);
        Route::post('/{id}/generate-document', [CertificationController::class, 'generateDocument']);
        Route::post('/{id}/upload-pdf', [CertificationController::class, 'uploadPdf']); // ✅ ADD THIS
        Route::post('/{id}/release', [CertificationController::class, 'release']);
        Route::post('/{id}/receive', [CertificationController::class, 'receive']);
        Route::get('/{id}/download', [CertificationController::class, 'download']);
        Route::get('/{id}/flow-status', [CertificationController::class, 'getFlowStatus']);
        Route::post('/{id}/zl-clearance', [CertificationController::class, 'updateZlClearance']);
        Route::post('/{id}/payment', [CertificationController::class, 'updatePayment']);
        Route::post('/{id}/online-payment', [CertificationController::class, 'processOnlinePayment']);
    });

    // ============================================
    // 3.8 CLEARANCE
    // ============================================
    // NOTE: "/configuration" must come before "/{id}"
    Route::prefix('/clearance')->group(function () {
        // Static routes FIRST
        Route::get('/', [ClearanceController::class, 'index']);
        Route::post('/', [ClearanceController::class, 'store']);
        Route::get('/configuration', [ClearanceController::class, 'getConfiguration']);
        Route::put('/configuration', [ClearanceController::class, 'updateConfiguration']);

        // Wildcard routes AFTER static
        Route::get('/{id}', [ClearanceController::class, 'show']);
        Route::post('/{id}/approve', [ClearanceController::class, 'approve']);
        Route::post('/{id}/reject', [ClearanceController::class, 'reject']);
        Route::post('/{id}/generate-document', [ClearanceController::class, 'generateDocument']);
        Route::post('/{id}/release', [ClearanceController::class, 'release']);
        Route::post('/{id}/receive', [ClearanceController::class, 'receive']);
        Route::get('/{id}/download', [ClearanceController::class, 'download']);
        Route::get('/{id}/flow-status', [ClearanceController::class, 'getFlowStatus']);
    });

    // ============================================
    // 3.9 PAYMENTS
    // ============================================
    Route::prefix('/payments')->group(function () {
        Route::get('/', [PaymentController::class, 'index']);
        Route::post('/', [PaymentController::class, 'store']);
        Route::get('/{id}', [PaymentController::class, 'show']);
        Route::get('/{id}/receipt', [PaymentController::class, 'receipt']);
    });

    // ============================================
    // 3.10 TAX PAYMENTS
    // ============================================
    Route::prefix('/tax-payments')->group(function () {
        Route::get('/', [TaxController::class, 'index']);
        Route::post('/', [TaxController::class, 'store']);
        Route::get('/{id}', [TaxController::class, 'show']);
        Route::get('/{id}/receipt', [TaxController::class, 'receipt']);
    });

    // ============================================
    // 3.11 TRANSACTIONS
    // ============================================
    // NOTE: "/summary" must come before "/{id}" or it'll be treated as an id.
    Route::prefix('/transactions')->group(function () {
        Route::get('/', [TransactionController::class, 'index']);
        Route::get('/summary', [TransactionController::class, 'summary']);
        Route::get('/{id}', [TransactionController::class, 'show']);
    });

    // ============================================
    // 3.12 PENALTIES
    // ============================================
    Route::prefix('/penalties')->group(function () {
        Route::get('/', [PenaltyController::class, 'index']);
        Route::post('/', [PenaltyController::class, 'store']);
        Route::get('/{id}', [PenaltyController::class, 'show']);
        Route::put('/{id}', [PenaltyController::class, 'update']);
        Route::delete('/{id}', [PenaltyController::class, 'destroy']);
    });

    // ============================================
    // 3.13 FINANCIAL REPORTS
    // ============================================
    // NOTE: "/pending" must come before "/{id}"
    Route::prefix('/financial-reports')->group(function () {
        Route::get('/', [FinancialReportController::class, 'index']);
        Route::post('/', [FinancialReportController::class, 'store']);
        Route::get('/pending', [FinancialReportController::class, 'pending']);
        Route::get('/{id}', [FinancialReportController::class, 'show']);
        Route::put('/{id}', [FinancialReportController::class, 'update']);
        Route::delete('/{id}', [FinancialReportController::class, 'destroy']);
        Route::post('/{id}/submit', [FinancialReportController::class, 'submit']);
        Route::post('/{id}/approve', [FinancialReportController::class, 'approve']);
        Route::post('/{id}/reject', [FinancialReportController::class, 'reject']);
    });

    // ============================================
    // 3.14 BNS ROUTES
    // ============================================
    Route::prefix('/bns')->group(function () {
        // Dashboard
        Route::get('/dashboard/stats', [BNSController::class, 'dashboardStats']);

        // Records - Static routes first
        Route::get('/records', [BNSController::class, 'getRecords']);
        Route::get('/records/export', [BNSController::class, 'exportRecords']);
        Route::get('/consolidate/{type}', [BNSController::class, 'consolidateDemographic']);

        // Reports - Static routes first
        Route::post('/reports/generate', [BNSController::class, 'generateReport']);
        Route::get('/zone-statistics', [BNSController::class, 'getAllZoneStatistics']);

        // Wildcard routes AFTER static
        Route::get('/records/{id}', [BNSController::class, 'getRecord']);
        Route::get('/reports/{id}', [BNSController::class, 'getReport']);
        Route::get('/reports/{id}/download', [BNSController::class, 'downloadReport']);
        Route::get('/zone-statistics/{zoneId}', [BNSController::class, 'getZoneStatistics']);
    });

    // ============================================
    // 3.15 FRONT DESK
    // ============================================
    Route::prefix('/frontdesk')->group(function () {
        Route::prefix('/requests')->group(function () {
            Route::get('/', [FrontDeskController::class, 'getRequests']);
            Route::post('/', [FrontDeskController::class, 'createRequest']);
            Route::get('/{id}', [FrontDeskController::class, 'getRequest']);
            Route::post('/{id}/process', [FrontDeskController::class, 'processRequest']);
            Route::post('/{id}/issue', [FrontDeskController::class, 'issueDocument']);
            Route::post('/{id}/forward', [FrontDeskController::class, 'forwardRequest']);
            Route::post('/{id}/cancel', [FrontDeskController::class, 'cancelRequest']);
        });

        Route::prefix('/queue')->group(function () {
            Route::get('/', [FrontDeskController::class, 'getQueue']);
            Route::post('/', [FrontDeskController::class, 'addToQueue']);
            Route::post('/call-next', [FrontDeskController::class, 'callNext']);
            Route::delete('/{id}', [FrontDeskController::class, 'removeFromQueue']);
        });

        Route::prefix('/appointments')->group(function () {
            Route::get('/', [FrontDeskController::class, 'getAppointments']);
            Route::post('/', [FrontDeskController::class, 'createAppointment']);
            Route::put('/{id}', [FrontDeskController::class, 'updateAppointment']);
            Route::post('/{id}/cancel', [FrontDeskController::class, 'cancelAppointment']);
        });

        Route::prefix('/claim-slips')->group(function () {
            Route::get('/', [FrontDeskController::class, 'getClaimSlips']);
            Route::post('/', [FrontDeskController::class, 'generateClaimSlip']);
            Route::get('/{id}/print', [FrontDeskController::class, 'printClaimSlip']);
            Route::post('/{id}/claim', [FrontDeskController::class, 'markClaimed']);
        });

        Route::prefix('/residents')->group(function () {
            Route::get('/', [FrontDeskController::class, 'getResidents']);
            Route::post('/', [FrontDeskController::class, 'registerResident']);
            Route::get('/{id}', [FrontDeskController::class, 'getResident']);
            Route::get('/{id}/verify', [FrontDeskController::class, 'verifyResident']);
        });

        Route::prefix('/tax')->group(function () {
            Route::get('/', [FrontDeskController::class, 'getTaxPayments']);
            Route::post('/', [FrontDeskController::class, 'storeTaxPayment']);
        });
    });

    // ============================================
    // 3.16 ANNOUNCEMENTS
    // ============================================
    // NOTE: "/public" must come before "/{id}" or it'll be treated as an id.
    Route::prefix('/announcements')->group(function () {
        Route::get('/', [AnnouncementController::class, 'index']);
        Route::get('/public', [AnnouncementController::class, 'getPublic']);
        Route::get('/{id}', [AnnouncementController::class, 'show']);
        Route::post('/', [AnnouncementController::class, 'store']);
        Route::put('/{id}', [AnnouncementController::class, 'update']);
        Route::delete('/{id}', [AnnouncementController::class, 'destroy']);
    });

    // ============================================
    // 3.17 NOTIFICATIONS
    // ============================================
    Route::prefix('/notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/mark-read', [NotificationController::class, 'markRead']);
        Route::post('/mark-all-read', [NotificationController::class, 'markAllRead']);
        Route::post('/send', [NotificationController::class, 'send']);
        Route::delete('/{id}', [NotificationController::class, 'destroy']);
    });

    // ============================================
    // 3.18 BARANGAY INFO
    // ============================================
    Route::prefix('/barangay-info')->group(function () {
        Route::get('/', [BarangayInfoController::class, 'index']);
        Route::put('/', [BarangayInfoController::class, 'update']);
    });

    // ============================================
    // 3.19 BARANGAY ZONES
    // ============================================
    Route::prefix('/barangay-zones')->group(function () {
        Route::get('/', [BarangayZoneController::class, 'index']);
        Route::get('/{id}', [BarangayZoneController::class, 'show']);
        Route::post('/', [BarangayZoneController::class, 'store']);
        Route::put('/{id}', [BarangayZoneController::class, 'update']);
        Route::delete('/{id}', [BarangayZoneController::class, 'destroy']);
    });

    // ============================================
    // 3.20 PRINT
    // ============================================
    Route::prefix('/print')->group(function () {
        Route::get('/receipt/{id}', [PrintController::class, 'receipt']);
        Route::get('/certificate/{id}', [PrintController::class, 'certificate']);
        Route::get('/tax-receipt/{id}', [PrintController::class, 'taxReceipt']);
        Route::get('/clearance/{id}', [PrintController::class, 'clearance']);
        Route::get('/claim-slip/{id}', [PrintController::class, 'claimSlip']);
    });

    // ============================================
    // 3.21 ACTIVITY LOGS
    // ============================================
    Route::prefix('/activity-logs')->group(function () {
        Route::get('/', [RecordActivityLogController::class, 'index']);
        Route::get('/encoder/{userId}', [RecordActivityLogController::class, 'getByEncoder']);
        Route::get('/record/{recordId}/{recordType}', [RecordActivityLogController::class, 'getByRecord']);
        Route::get('/{id}', [RecordActivityLogController::class, 'show']);
        Route::post('/', [RecordActivityLogController::class, 'store']);
        Route::delete('/{id}', [RecordActivityLogController::class, 'destroy']);
    });

    // ============================================
    // 3.22 RECORDS APPROVAL
    // ============================================
    Route::prefix('/records')->group(function () {
        Route::get('/pending', [RecordsController::class, 'getPendingRecords']);
        Route::get('/stats', [RecordsController::class, 'stats']);
        Route::post('/{id}/approve', [RecordsController::class, 'approveRecord']);
        Route::post('/{id}/reject', [RecordsController::class, 'rejectRecord']);
    });

    // ============================================
    // 3.23 GEO / MAP
    // ============================================
    Route::prefix('/geo')->group(function () {
        Route::get('/houses', [HouseGeotagController::class, 'index']);
        Route::get('/houses/household/{householdId}', [HouseGeotagController::class, 'getByHousehold']);
        Route::get('/houses/zone/{zoneId}', [HouseGeotagController::class, 'getByZone']);
        Route::post('/houses', [HouseGeotagController::class, 'store']);
        Route::put('/houses/{id}', [HouseGeotagController::class, 'update']);
        Route::delete('/houses/{id}', [HouseGeotagController::class, 'destroy']);
    });

    // ============================================
    // 3.24 HEALTH ROUTES
    // ============================================
    Route::prefix('/health')->group(function () {
        // Stats
        Route::get('/stats', [HealthStatsController::class, 'index']);
        Route::get('/zone-statistics', [HealthStatsController::class, 'zoneStats']);

        Route::get('/reports', [HealthReportsController::class, 'index']);

        // Patients - Static routes first
        Route::get('/patients', [PatientController::class, 'index']);
        Route::post('/patients', [PatientController::class, 'store']); // ✅ ADDED
        Route::post('/patients/search', [PatientController::class, 'searchResident']);
        Route::get('/checkups', [PatientController::class, 'getAllCheckups']);

        // ✅ Patient details wildcard — MUST come AFTER static /patients routes
        Route::get('/patients/{id}', [PatientController::class, 'show']);
        Route::get('/patients/resident/{residentId}', [PatientController::class, 'getByResident']);
        Route::get('/patients/{patientRecordId}/checkups', [PatientController::class, 'getCheckups']);
        Route::post('/patients/{patientRecordId}/checkups', [PatientController::class, 'storeCheckup']);

        // Patient records - Static routes first
        Route::prefix('/records/pregnant')->group(function () {
            Route::get('/', [PatientController::class, 'getPregnantRecords']);
            Route::get('/{id}', [PatientController::class, 'getPregnancyDetails']);
            Route::post('/{id}/checkup', [PatientController::class, 'storePregnancyCheckup']);
        });

        Route::prefix('/records/children')->group(function () {
            Route::get('/', [PatientController::class, 'getChildrenRecords']);
            Route::get('/{id}', [PatientController::class, 'getChildDetails']);
            Route::post('/{id}/checkup', [PatientController::class, 'storeChildCheckup']);
        });

        Route::prefix('/records/lactating')->group(function () {
            Route::get('/', [PatientController::class, 'getLactatingRecords']);
            Route::get('/{id}', [PatientController::class, 'getLactatingDetails']);
            Route::post('/{id}/checkup', [PatientController::class, 'storeLactatingCheckup']);
        });

        Route::prefix('/records/senior')->group(function () {
            Route::get('/', [PatientController::class, 'getSeniorRecords']);
            Route::get('/{id}', [PatientController::class, 'getSeniorDetails']);
            Route::post('/{id}/checkup', [PatientController::class, 'storeSeniorCheckup']);
        });

        Route::prefix('/records/other')->group(function () {
            Route::get('/', [PatientController::class, 'getOtherRecords']);
            Route::get('/{id}', [PatientController::class, 'getOtherDetails']);
            Route::post('/{id}/checkup', [PatientController::class, 'storeOtherCheckup']);
        });

        // Maternal profiles (BNS)
        Route::get('/maternal', [PatientController::class, 'getMaternalProfiles']);
        Route::get('/maternal/{id}', [PatientController::class, 'getMaternalProfile']);
        Route::post('/maternal', [PatientController::class, 'storeMaternalProfile']);
        Route::put('/maternal/{id}', [PatientController::class, 'updateMaternalProfile']);
        Route::delete('/maternal/{id}', [PatientController::class, 'destroyMaternalProfile']);

        // Nutrition assessments (BNS)
        Route::get('/nutrition/assessments', [PatientController::class, 'getNutritionAssessments']);
        Route::get('/nutrition/assessments/{id}', [PatientController::class, 'getNutritionAssessment']);
        Route::post('/nutrition/assessments', [PatientController::class, 'storeNutritionAssessment']);
        Route::put('/nutrition/assessments/{id}', [PatientController::class, 'updateNutritionAssessment']);
        Route::delete('/nutrition/assessments/{id}', [PatientController::class, 'destroyNutritionAssessment']);

        // Programs (BNS)
        Route::get('/programs', [PatientController::class, 'getPrograms']);
        Route::get('/programs/{id}', [PatientController::class, 'getProgram']);
        Route::post('/programs', [PatientController::class, 'storeProgram']);
        Route::put('/programs/{id}', [PatientController::class, 'updateProgram']);
        Route::delete('/programs/{id}', [PatientController::class, 'destroyProgram']);
        Route::get('/programs/{programId}/participants', [PatientController::class, 'getProgramParticipants']);
        Route::post('/programs/{programId}/participants', [PatientController::class, 'addProgramParticipant']);
        Route::delete('/programs/{programId}/participants/{participantId}', [PatientController::class, 'removeProgramParticipant']);
    });

    // ============================================
    // 3.25 PERSONNEL MANAGEMENT
    // ============================================
    Route::prefix('/personnel')->group(function () {
        Route::get('/', [PersonnelController::class, 'index']);
        Route::get('/role/{roleName}', [PersonnelController::class, 'getByRole']);
        Route::get('/roles-with-count', [PersonnelController::class, 'getRolesWithCount']);
        Route::get('/stats', [PersonnelController::class, 'stats']);
        Route::post('/assign-role', [PersonnelController::class, 'assignRole']);
        Route::post('/remove-role', [PersonnelController::class, 'removeRole']);
    });

    // ============================================
    // 3.26 ADMIN USER MANAGEMENT
    // ============================================
    Route::prefix('/admin-users')->group(function () {
        Route::post('/', [AdminUserController::class, 'store']);
        Route::get('/without-resident', [AdminUserController::class, 'getUsersWithoutResident']);
        Route::get('/available-residents', [AdminUserController::class, 'getAvailableResidents']);
    });
});
