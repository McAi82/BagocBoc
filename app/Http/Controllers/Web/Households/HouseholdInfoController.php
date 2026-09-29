<?php

namespace App\Http\Controllers\Web\Households;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Models\RecordActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class HouseholdInfoController extends Controller
{
    /**
     * Get all households with relationships
     */
    public function index()
    {
        try {
            Log::info('Fetching households info...');
            
            // ✅ Load relationships carefully - only load what exists
            $households = Household::with([
                'address',
                'address.barangayZone',
                'residents',
                'censusRecords',
                'censusRecords.householdEnvironment', // ✅ Now this works
                'geotag',
            ])->get();

            Log::info('Households fetched: ' . $households->count());

            return response()->json([
                'success' => true,
                'message' => 'Households retrieved successfully',
                'data' => $households,
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('HouseholdInfoController index error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            // ✅ Return empty array instead of failing
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch households: ' . $e->getMessage(),
                'data' => [],
            ], 200);
        }
    }

    /**
     * Get single household with relationships
     */
    public function show($id)
    {
        try {
            $household = Household::with([
                'address',
                'address.barangayZone',
                'residents',
                'censusRecords',
                'censusRecords.householdEnvironment',
                'geotag',
            ])->find($id);

            if (!$household) {
                return response()->json([
                    'success' => false,
                    'message' => 'Household not found',
                    'data' => null,
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Household retrieved successfully',
                'data' => $household,
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('HouseholdInfoController show error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch household: ' . $e->getMessage(),
                'data' => null,
            ], 500);
        }
    }

    /**
     * Get households by encoder
     */
    public function getByEncoder($userId)
    {
        try {
            $householdIds = RecordActivityLog::where('encoded_by', $userId)
                ->where('record_type', Household::class)
                ->where('action', 'Added Household')
                ->pluck('record_id');

            $households = Household::with([
                'address',
                'address.barangayZone',
                'residents',
                'censusRecords',
                'censusRecords.householdEnvironment',
                'geotag',
            ])->whereIn('id', $householdIds)->get();

            if ($households->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No households found for this encoder',
                    'data' => [],
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Households retrieved successfully',
                'data' => $households,
            ], 200);
            
        } catch (\Exception $e) {
            Log::error('HouseholdInfoController getByEncoder error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch households: ' . $e->getMessage(),
                'data' => [],
            ], 500);
        }
    }
}