<?php

namespace App\Http\Controllers\Web\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\Household;
use App\Models\Clearance;
use App\Models\Certification;
use App\Models\Payment;
use App\Models\FrontDeskRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function stats(Request $request)
    {
        $stats = [
            'total_residents' => Resident::count(),
            'total_households' => Household::count(),
            'pending_certifications' => Certification::where('status', 'Pending')->count(),
            'pending_clearances' => Clearance::where('status', 'pending')->count(),
            'today_appointments' => FrontDeskRequest::whereDate('created_at', today())->count(),
            'today_transactions' => Payment::whereDate('created_at', today())->count(),
            'total_revenue' => Payment::where('status', 'completed')->sum('amount'),
            'recent_activities' => $this->getRecentActivities(),
            'zone_statistics' => $this->getZoneStatistics(),
        ];

        return $this->respondSuccess($stats);
    }

    /**
     * Get recent activities
     */
    private function getRecentActivities()
    {
        // Implement logic to fetch recent activities
        return DB::table('record_activity_logs')
            ->latest()
            ->limit(10)
            ->get();
    }

    /**
     * Get zone statistics
     */
    private function getZoneStatistics()
    {
        return DB::table('barangay_zones')
            ->leftJoin('household_addresses', 'barangay_zones.id', '=', 'household_addresses.zone')
            ->leftJoin('households', 'household_addresses.id', '=', 'households.address_id')
            ->leftJoin('resident_households', 'households.id', '=', 'resident_households.household_id')
            ->select(
                'barangay_zones.id as zone_id',
                'barangay_zones.name as zone_name',
                DB::raw('COUNT(DISTINCT households.id) as household_count'),
                DB::raw('COUNT(DISTINCT resident_households.resident_id) as resident_count')
            )
            ->groupBy('barangay_zones.id', 'barangay_zones.name')
            ->get();
    }
}