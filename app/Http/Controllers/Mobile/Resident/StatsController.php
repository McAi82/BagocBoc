<?php

namespace App\Http\Controllers\Mobile\Resident;

use App\Http\Controllers\Controller;
use App\Models\Certification;
use App\Models\Penalty;
use App\Models\Clearance;
use App\Models\NotificationRecipient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class StatsController extends Controller
{
    /**
     * Get resident dashboard stats for mobile
     * (Read-only; no notifications fired)
     */
    public function index()
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            if (!$user->resident_id) {
                return response()->json([
                    'success' => true,
                    'message' => 'No resident profile found',
                    'data' => $this->getDefaultStats()
                ], 200);
            }

            $residentId = $user->resident_id;
            $userId = $user->id;

            $pendingCertificates = 0;
            try {
                $pendingCertificates = Certification::where('resident_id', $residentId)
                    ->whereIn('status', ['Pending', 'In Review'])
                    ->count();
            } catch (\Exception $e) {
                Log::error('Mobile stats - pendingCertificates error: ' . $e->getMessage());
            }

            $totalPenalties = 0;
            try {
                $totalPenalties = (float) Penalty::where('resident_id', $residentId)
                    ->where('status', 'pending')
                    ->sum('amount');
            } catch (\Exception $e) {
                Log::error('Mobile stats - totalPenalties error: ' . $e->getMessage());
            }

            $notifications = 0;
            try {
                $notifications = NotificationRecipient::where('user_id', $userId)
                    ->where('is_read', false)
                    ->count();
            } catch (\Exception $e) {
                Log::error('Mobile stats - notifications error: ' . $e->getMessage());
            }

            $pendingClearances = 0;
            try {
                $pendingClearances = Clearance::where('resident_id', $residentId)
                    ->where('status', 'pending')
                    ->count();
            } catch (\Exception $e) {
                Log::error('Mobile stats - pendingClearances error: ' . $e->getMessage());
            }

            $totalCertificates = 0;
            try {
                $totalCertificates = Certification::where('resident_id', $residentId)->count();
            } catch (\Exception $e) {
                Log::error('Mobile stats - totalCertificates error: ' . $e->getMessage());
            }

            $stats = [
                'pendingCertificates' => (int) $pendingCertificates,
                'totalPenalties' => (float) $totalPenalties,
                'notifications' => (int) $notifications,
                'pendingClearances' => (int) $pendingClearances,
                'totalCertificates' => (int) $totalCertificates,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Stats retrieved successfully',
                'data' => $stats
            ], 200);
        } catch (\Exception $e) {
            Log::error('Mobile stats error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'success' => true,
                'message' => 'Stats retrieved with defaults',
                'data' => $this->getDefaultStats()
            ], 200);
        }
    }

    private function getDefaultStats()
    {
        return [
            'pendingCertificates' => 0,
            'totalPenalties' => 0,
            'notifications' => 0,
            'pendingClearances' => 0,
            'totalCertificates' => 0,
        ];
    }
}
