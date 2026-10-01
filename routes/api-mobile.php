<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Mobile\Auth\AuthController;
use App\Http\Controllers\Mobile\Health\OptPlusController;
use App\Http\Controllers\Mobile\Health\MaternalController;
use App\Http\Controllers\Mobile\Health\NutritionAssessmentController;
use App\Http\Controllers\Mobile\Health\ProgramController as HealthProgramController;
use App\Http\Controllers\Mobile\Health\ProgramController as ResidentProgramController;
use App\Http\Controllers\Mobile\Health\HealthStatsController;
use App\Http\Controllers\Mobile\Census\HouseholdController as CensusHouseholdController;
use App\Http\Controllers\Mobile\Resident\ResidentController as CensusResidentController;
use App\Http\Controllers\Mobile\Resident\ResidentController as MobileResidentController;
use App\Http\Controllers\Mobile\Resident\StatsController;
use App\Http\Controllers\Mobile\Geo\HouseGeotagController;
use App\Http\Controllers\Mobile\Geo\BarangayZoneController;
use App\Http\Controllers\Mobile\Zone\ZoneController;
use App\Http\Controllers\Mobile\Zone\CertificateRequestController;
use App\Http\Controllers\Mobile\Zone\ClearanceGenerationController;
use App\Http\Controllers\Mobile\Zone\ComplianceManagementController;
use App\Http\Controllers\Mobile\Notifications\NotificationController as MobileNotificationController;
use App\Http\Controllers\Web\Records\RecordsController;
use App\Http\Controllers\Mobile\QR\QRController;
use App\Http\Controllers\Mobile\Certificates\CertificateDownloadController;
use App\Http\Controllers\Web\Auth\AccountActivationController;

/*
|--------------------------------------------------------------------------
| Mobile API Routes
|--------------------------------------------------------------------------
| All routes are prefixed with /api/mobile
| ⚠️ IMPORTANT: Static routes MUST be defined BEFORE wildcard routes
*/

// ============================================
// PUBLIC AUTH ROUTES
// ============================================

Route::get(
    '/certificates/download/{token}',
    [CertificateDownloadController::class, 'download']
)->name('certificates.download.one_time');

Route::post('/account-activation/verify', [AccountActivationController::class, 'verifyRecords']);
Route::post('/account-activation/request', [AccountActivationController::class, 'store']);

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/verify-registration-otp', [AuthController::class, 'verifyRegistrationOtp']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/check-email', [AuthController::class, 'checkEmail']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

Route::prefix('/qr')->group(function () {
    // ✅ STATIC ROUTES FIRST — no wildcard conflicts
    Route::post('/validate', [QRController::class, 'validateQR']);
    Route::get('/stats', [QRController::class, 'stats']);
    Route::post('/bulk-generate', [QRController::class, 'bulkGenerate']);

    // ✅ WILDCARD ROUTES AFTER
    Route::get('/household/{householdId}', [QRController::class, 'getByHousehold']);
    Route::get('/household/{householdId}/print', [QRController::class, 'print']);
    Route::post('/generate/{householdId}', [QRController::class, 'generate']);
});

// ============================================
// PROTECTED MOBILE ROUTES
// ============================================

Route::middleware(['auth:sanctum', 'mobile.access'])->group(function () {

    // ============================================
    // USER & AUTH (All Mobile Users)
    // ============================================

    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // ============================================
    // RESIDENT PROFILE (All Mobile Users)
    // ============================================

    Route::prefix('/resident')->group(function () {
        // Profile
        Route::get('/profile', [MobileResidentController::class, 'profile']);
        Route::put('/profile', [MobileResidentController::class, 'updateProfile']);

        // Stats
        Route::get('/stats', [StatsController::class, 'index']);

        // ✅ Static routes BEFORE wildcard
        Route::get('/certificates', [MobileResidentController::class, 'myCertificates']);
        Route::get('/certificate-types', [MobileResidentController::class, 'getCertificateTypes']);
        Route::post('/certificates', [MobileResidentController::class, 'requestCertificate']);

        // ✅ Wildcard routes AFTER static
        Route::get('/certificates/{id}/download', [MobileResidentController::class, 'downloadCertificate']);
        Route::get('/certificates/{id}', [MobileResidentController::class, 'getCertificateDetail']);
        Route::delete('/certificates/{id}', [MobileResidentController::class, 'cancelCertificateRequest']);

        // Compliance
        Route::get('/compliance', [MobileResidentController::class, 'getComplianceChecklist']);

        // Penalties
        Route::get('/penalties', [MobileResidentController::class, 'myPenalties']);
        Route::post('/penalties/{id}/pay', [MobileResidentController::class, 'payPenalty']);

        // Payments
        Route::get('/payments', [MobileResidentController::class, 'myPayments']);
        Route::post('/payments', [MobileResidentController::class, 'processPayment']);
        Route::get('/payments/{id}/receipt', [MobileResidentController::class, 'getPaymentReceipt']);

        // Clearance
        Route::get('/clearance/{id}', [MobileResidentController::class, 'getClearance']);
        Route::delete('/clearance/{id}', [MobileResidentController::class, 'cancelClearance']);

        // Account Activation
        Route::post('/activation', [MobileResidentController::class, 'requestActivation']);
    });

    // ============================================
    // NOTIFICATIONS (All Mobile Users)
    // ============================================

    Route::prefix('/notifications')->group(function () {
        // ✅ STATIC FIRST
        Route::get('/', [MobileNotificationController::class, 'index']);
        Route::get('/unread-count', [MobileNotificationController::class, 'unreadCount']);
        Route::post('/mark-all-read', [MobileNotificationController::class, 'markAllRead']);

        // ✅ WILDCARD AFTER
        Route::post('/{id}/read', [MobileNotificationController::class, 'markRead']);
        Route::delete('/{id}', [MobileNotificationController::class, 'destroy']);
    });

    // ============================================
    // SHARED: ALL MOBILE USERS - Census Stats
    // ============================================

    Route::prefix('/census')->group(function () {
        Route::get('/stats', [CensusHouseholdController::class, 'getStats']);
    });

    // ============================================
    // BARANGAY HEALTH WORKER ROUTES
    // ============================================

    Route::middleware(['role:Barangay Health Worker'])->group(function () {

        // Census / Household Management
        Route::prefix('/census')->group(function () {
            // ✅ STATIC ROUTES FIRST

            // Residents - Static
            Route::post('/resident', [CensusResidentController::class, 'store']);
            Route::get('/residents', [CensusResidentController::class, 'index']);
            Route::get('/residents/encoder/{userId}', [CensusResidentController::class, 'getByEncoder']);

            // Households - Static
            Route::post('/households', [CensusHouseholdController::class, 'store']);
            Route::get('/households', [CensusHouseholdController::class, 'index']);
            Route::get('/households/search', [CensusHouseholdController::class, 'search']);
            Route::post('/households/add-resident', [CensusHouseholdController::class, 'addResident']);
            Route::post('/households/remove-resident', [CensusHouseholdController::class, 'removeResident']);

            // Census Records - Static
            Route::post('/add-record', [CensusHouseholdController::class, 'storeCensus']);
            Route::get('/records', [CensusHouseholdController::class, 'indexCensus']);

            // Food Production - Static
            Route::get('/food-production-types', [CensusHouseholdController::class, 'getFoodProductionTypes']);

            // Survey - Static
            Route::post('/survey', [CensusHouseholdController::class, 'submitSurvey']);

            // ✅ WILDCARD ROUTES AFTER STATIC

            // Residents - Wildcard
            Route::get('/residents/{id}', [CensusResidentController::class, 'show']);
            Route::put('/residents/{id}', [CensusResidentController::class, 'update']);
            Route::delete('/residents/{id}', [CensusResidentController::class, 'destroy']);

            // Households - Wildcard
            Route::get('/households/{id}', [CensusHouseholdController::class, 'show']);
            Route::put('/households/{id}', [CensusHouseholdController::class, 'update']);
            Route::delete('/households/{id}', [CensusHouseholdController::class, 'destroy']);

            // Census Records - Wildcard
            Route::get('/records/{id}', [CensusHouseholdController::class, 'showCensus']);
        });

        // Geo / Geotagging
        Route::prefix('/geo')->group(function () {
            // ✅ STATIC ROUTES FIRST
            Route::get('/houses', [HouseGeotagController::class, 'index']);
            Route::get('/houses/household/{householdId}', [HouseGeotagController::class, 'getByHousehold']);
            Route::get('/houses/zone/{zoneId}', [HouseGeotagController::class, 'getByZone']);
            Route::post('/mark-house', [HouseGeotagController::class, 'store']);

            // ✅ WILDCARD ROUTES AFTER STATIC
            Route::put('/houses/{id}', [HouseGeotagController::class, 'update']);
            Route::delete('/houses/{id}', [HouseGeotagController::class, 'destroy']);
        });

        // Barangay Info
        Route::get('/barangay-zones', [BarangayZoneController::class, 'index']);
        Route::get('/barangay-zones/{id}', [BarangayZoneController::class, 'show']);

        // Registration Submission
        Route::prefix('/registrations')->group(function () {
            Route::post('/submit', [ZoneController::class, 'submit']);
        });
    });

    // ============================================
    // BARANGAY NUTRITION SCHOLAR ROUTES
    // ============================================

    Route::middleware(['role:Barangay Nutrition Scholar'])->group(function () {

        // OPT Plus Assessments
        Route::prefix('/health/opt-plus')->group(function () {
            // ✅ STATIC ROUTES FIRST
            Route::get('/', [OptPlusController::class, 'index']);
            Route::get('/encoder/{userId}', [OptPlusController::class, 'getByEncoder']);
            Route::post('/', [OptPlusController::class, 'store']);

            // ✅ WILDCARD ROUTES AFTER STATIC
            Route::put('/{id}', [OptPlusController::class, 'update']);
            Route::delete('/{id}', [OptPlusController::class, 'destroy']);
        });

        // Maternal Profiles
        Route::apiResource('/health/maternal', MaternalController::class);

        // Nutrition Assessments
        Route::prefix('/health/nutrition')->group(function () {
            // ✅ STATIC ROUTES FIRST
            Route::get('/assessments', [NutritionAssessmentController::class, 'index']);
            Route::post('/assessments', [NutritionAssessmentController::class, 'store']);

            // ✅ WILDCARD ROUTES AFTER STATIC
            Route::get('/assessments/{id}', [NutritionAssessmentController::class, 'show']);
            Route::put('/assessments/{id}', [NutritionAssessmentController::class, 'update']);
            Route::delete('/assessments/{id}', [NutritionAssessmentController::class, 'destroy']);
        });

        // Programs
        Route::prefix('/health/programs')->group(function () {
            // ✅ STATIC ROUTES FIRST
            Route::get('/', [HealthProgramController::class, 'index']);
            Route::post('/', [HealthProgramController::class, 'store']);

            // ✅ WILDCARD ROUTES AFTER STATIC
            Route::get('/{id}', [HealthProgramController::class, 'show']);
            Route::put('/{id}', [HealthProgramController::class, 'update']);
            Route::delete('/{id}', [HealthProgramController::class, 'destroy']);
        });
    });

    // ============================================
    // SHARED: BHW & BNS
    // ============================================

    Route::middleware(['role:Barangay Health Worker,Barangay Nutrition Scholar'])->group(function () {
        // Activity Logs
        Route::get('/activity-logs/encoder/{userId}', [RecordsController::class, 'logsByEncoder']);
        Route::post('/activity-logs', [RecordsController::class, 'storeLog']);

        // Residents (Read only) - STATIC FIRST
        Route::get('/residents', [CensusResidentController::class, 'index']);
        Route::get('/residents/encoder/{userId}', [CensusResidentController::class, 'getByEncoder']);

        // Residents (Read only) - WILDCARD AFTER
        Route::get('/residents/{id}', [CensusResidentController::class, 'show']);
    });

    // ============================================
    // SHARED: BHW & ZONE LEADER - Registration Status
    // ============================================

    Route::middleware(['role:Barangay Health Worker,Zone Leader'])->group(function () {
        Route::prefix('/registrations')->group(function () {
            Route::get('/status/{residentId}', [ZoneController::class, 'getStatus']);
        });
    });

    // ============================================
    // SHARED: ALL MOBILE USERS - Health Stats
    // ============================================

    Route::prefix('/health')->group(function () {
        Route::get('/stats', [HealthStatsController::class, 'index']);
        Route::get('/zone-statistics', [HealthStatsController::class, 'zoneStats']);
        Route::post('/reports/generate', [HealthStatsController::class, 'generateReport']);
        Route::get('/demographic-filters', [HealthStatsController::class, 'demographicFilters']);

        // ✅ STATIC FIRST
        Route::get('/records', [HealthStatsController::class, 'records']);

        // ✅ WILDCARD AFTER
        Route::get('/records/{id}', [HealthStatsController::class, 'showRecord']);
    });

    // ============================================
    // ZONE LEADER ROUTES
    // ============================================

    Route::middleware(['role:Zone Leader'])->group(function () {

        // Zone Management
        Route::prefix('/zone')->group(function () {
            // ✅ STATIC ROUTES FIRST
            Route::post('/check-in', [ZoneController::class, 'storeCheckIn']);
            Route::get('/check-ins', [ZoneController::class, 'indexCheckIns']);
            Route::get('/check-ins/my', [ZoneController::class, 'myCheckIns']);
            Route::get('/stats', [ZoneController::class, 'indexStats']);
            Route::get('/certificate-requests', [CertificateRequestController::class, 'index']);
            Route::get('/compliance', [ComplianceManagementController::class, 'index']);
            Route::post('/compliance', [ComplianceManagementController::class, 'store']);
            Route::get('/residents', [CensusResidentController::class, 'index']);
            Route::get('/households', [CensusHouseholdController::class, 'index']);
            Route::get('/census/records', [CensusHouseholdController::class, 'indexCensus']);

            // ✅ WILDCARD ROUTES AFTER STATIC

            // Certificate Requests
            Route::post('/certificate-requests/{id}/approve', [CertificateRequestController::class, 'approve']);
            Route::post('/certificate-requests/{id}/reject', [CertificateRequestController::class, 'reject']);

            Route::get('/check-ins/{id}', [ZoneController::class, 'showCheckIn']);
            Route::post('/clearance/{residentId}', [ClearanceGenerationController::class, 'generate']);
            Route::get('/clearance/{id}', [ClearanceGenerationController::class, 'show']);
            Route::post('/clearance/{id}/release', [ClearanceGenerationController::class, 'release']);
            Route::put('/compliance/{id}', [ComplianceManagementController::class, 'update']);
            Route::delete('/compliance/{id}', [ComplianceManagementController::class, 'destroy']);
            Route::get('/residents/{id}', [CensusResidentController::class, 'show']);
            Route::get('/households/{id}', [CensusHouseholdController::class, 'show']);
            Route::get('/census/records/{id}', [CensusHouseholdController::class, 'showCensus']);

            // Registration Approval
            Route::prefix('/registrations')->group(function () {
                Route::get('/pending', [ZoneController::class, 'pending']);
                Route::post('/{id}/approve', [ZoneController::class, 'approve']);
                Route::post('/{id}/reject', [ZoneController::class, 'reject']);
            });

            Route::prefix('/confirmations')->group(function () {
                Route::get('/pending', [ZoneController::class, 'pendingConfirmations']);
                Route::post('/{id}/confirm', [ZoneController::class, 'confirmConfirmation']);
                Route::post('/{id}/reject', [ZoneController::class, 'rejectConfirmation']);
            });
        });

        // View Residents & Households (Read only)
        Route::get('/residents', [CensusResidentController::class, 'index']);
        Route::get('/households', [CensusHouseholdController::class, 'index']);
        Route::get('/households/{id}', [CensusHouseholdController::class, 'show']);
    });

    // ============================================
    // RESIDENT ROUTES
    // ============================================

    Route::middleware(['role:Resident'])->group(function () {

        // Programs
        Route::prefix('/programs')->group(function () {
            // ✅ STATIC ROUTES FIRST
            Route::get('/', [ResidentProgramController::class, 'publicIndex']);

            // ✅ WILDCARD ROUTES AFTER STATIC
            Route::get('/{id}', [ResidentProgramController::class, 'show']);
        });
    });
});
