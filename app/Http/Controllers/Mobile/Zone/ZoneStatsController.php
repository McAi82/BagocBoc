<?php
// app/Http/Controllers/Mobile/Zone/ZoneStatsController.php

namespace App\Http\Controllers\Mobile\Zone;

use App\Http\Controllers\Controller;
use App\Models\FrontDeskRequest;
use App\Models\AccountActivation;
use App\Models\Resident;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ZoneStatsController extends Controller
{
    public function index()
    {
        try {
            $stats = [
                'pendingRequests' => $this->getPendingRequests(),
                'pendingRegistrations' => $this->getPendingRegistrations(),
                'totalResidents' => $this->getTotalResidents(),
                'totalCompliance' => 0,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Stats retrieved successfully',
                'data' => $stats
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('Zone stats error: ' . $e->getMessage());
            
            return response()->json([
                'success' => true,
                'message' => 'Stats retrieved with defaults',
                'data' => [
                    'pendingRequests' => 0,
                    'pendingRegistrations' => 0,
                    'totalResidents' => Resident::count(),
                    'totalCompliance' => 0,
                ]
            ], 200);
        }
    }

    private function getPendingRequests()
    {
        try {
            // Check if FrontDeskRequest model exists
            if (class_exists('App\Models\FrontDeskRequest')) {
                return \App\Models\FrontDeskRequest::where('status', 'pending')->count();
            }
            return 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getPendingRegistrations()
    {
        try {
            // Check if AccountActivation model exists
            if (class_exists('App\Models\AccountActivation')) {
                return \App\Models\AccountActivation::where('status', 'pending')->count();
            }
            return 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    private function getTotalResidents()
    {
        try {
            return Resident::count();
        } catch (\Exception $e) {
            return 0;
        }
    }
}