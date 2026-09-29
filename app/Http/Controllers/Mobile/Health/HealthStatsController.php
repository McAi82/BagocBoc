<?php

namespace App\Http\Controllers\Mobile\Health;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\ProgramParticipant;
use App\Models\MaternalProfile;
use App\Models\BarangayZone;
use App\Models\Household;
use App\Models\NutritionAssessment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HealthStatsController extends Controller
{
    /**
     * Get health dashboard statistics (read-only)
     */
    public function index()
    {
        try {
            $stats = [
                'totalResidents' => Resident::count(),
                'pregnant' => MaternalProfile::where('pregnancy_status', 'pregnant')->count(),
                'breastfeeding' => $this->getBreastfeedingCount(),
                'underweight' => $this->getUnderweightCount(),
                'zones' => BarangayZone::count(),
                'coverage' => $this->calculateCoverage(),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Health statistics retrieved successfully',
                'data' => $stats
            ], 200);
        } catch (\Exception $e) {
            Log::error('Health stats error: ' . $e->getMessage());

            return response()->json([
                'success' => true,
                'message' => 'Health statistics retrieved with defaults',
                'data' => [
                    'totalResidents' => Resident::count(),
                    'pregnant' => 0,
                    'breastfeeding' => 0,
                    'underweight' => 0,
                    'zones' => BarangayZone::count(),
                    'coverage' => 0,
                ]
            ], 200);
        }
    }

    public function zoneStats()
    {
        try {
            $zones = BarangayZone::withCount(['householdAddresses as households_count'])
                ->get()
                ->map(function ($zone) {
                    $residentCount = DB::table('household_addresses')
                        ->join('households', 'household_addresses.id', '=', 'households.address_id')
                        ->join('resident_households', 'households.id', '=', 'resident_households.household_id')
                        ->where('household_addresses.zone', $zone->id)
                        ->where('resident_households.status', 'active')
                        ->count();

                    $geotagged = DB::table('house_geotags')
                        ->join('households', 'house_geotags.household_id', '=', 'households.id')
                        ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
                        ->where('household_addresses.zone', $zone->id)
                        ->count();

                    $healthConcerns = $this->getZoneHealthConcerns($zone->id);
                    $genderDistribution = $this->getZoneGenderDistribution($zone->id);
                    $ageDistribution = $this->getZoneAgeDistribution($zone->id);

                    return [
                        'zone_id' => $zone->id,
                        'zone_name' => $zone->name,
                        'population' => $residentCount,
                        'households' => $zone->households_count,
                        'geotagged' => $geotagged,
                        'health_concerns' => $healthConcerns,
                        'gender_distribution' => $genderDistribution,
                        'age_distribution' => $ageDistribution,
                        'latitude' => 8.4198 + ($zone->id * 0.002),
                        'longitude' => 124.5022 + ($zone->id * 0.002),
                    ];
                });

            return $this->respondSuccess($zones);
        } catch (\Exception $e) {
            Log::error('Zone stats error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch zone statistics', null, 500);
        }
    }

    public function generateReport(Request $request)
    {
        try {
            $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
                'demographics' => 'required|array',
                'report_type' => 'required|in:summary,detailed,statistical',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $demographics = $request->demographics;
            $reportType = $request->report_type;

            $data = $this->buildReportData($demographics, $reportType);

            return $this->respondSuccess([
                'title' => ucfirst($reportType) . ' Report',
                'generated_at' => now()->toISOString(),
                'total' => count($data),
                'data' => $data,
                'summary' => $this->generateSummary($data),
            ]);
        } catch (\Exception $e) {
            Log::error('Report generation error: ' . $e->getMessage());
            return $this->respondError('Failed to generate report', null, 500);
        }
    }

    public function demographicFilters()
    {
        try {
            $households = DB::table('barangay_zones')
                ->select('id', 'name')
                ->get()
                ->map(function ($zone) {
                    $count = DB::table('household_addresses')
                        ->join('households', 'household_addresses.id', '=', 'households.address_id')
                        ->where('household_addresses.zone', $zone->id)
                        ->count();

                    return [
                        'id' => $zone->id,
                        'name' => $zone->name,
                        'count' => $count,
                    ];
                });

            $families = DB::table('residents')
                ->select('last_name')
                ->distinct()
                ->limit(20)
                ->get()
                ->map(function ($resident) {
                    $count = Resident::where('last_name', $resident->last_name)->count();
                    return [
                        'id' => $resident->last_name,
                        'name' => $resident->last_name . ' Family',
                        'count' => $count,
                    ];
                });

            return $this->respondSuccess([
                'households' => $households,
                'families' => $families,
            ]);
        } catch (\Exception $e) {
            Log::error('Demographic filters error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch demographic filters', null, 500);
        }
    }

    public function records(Request $request)
    {
        try {
            $query = Resident::with(['households']);

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'LIKE', "%{$search}%")
                        ->orWhere('last_name', 'LIKE', "%{$search}%")
                        ->orWhere('phone_number', 'LIKE', "%{$search}%");
                });
            }

            if ($request->has('filter')) {
                switch ($request->filter) {
                    case 'pregnant':
                        $query->whereHas('maternalProfile', function ($q) {
                            $q->where('pregnancy_status', 'pregnant');
                        });
                        break;
                    case 'breastfeeding':
                        // Add filter logic
                        break;
                    case 'underweight':
                        // Add filter logic
                        break;
                }
            }

            $records = $query->latest()->paginate(20);

            $formattedRecords = $records->map(function ($resident) {
                return [
                    'id' => $resident->id,
                    'resident_name' => $resident->full_name,
                    'household_number' => $resident->households->first()->household_number ?? 'N/A',
                    'gender' => $resident->gender,
                    'age' => $resident->age,
                    'birth_date' => $resident->birth_date,
                    'pregnancy_status' => $resident->maternalProfile->pregnancy_status ?? null,
                    'breastfeeding' => false,
                    'nutrition_status' => null,
                    'zone' => $resident->households->first()->address->barangayZone->name ?? 'N/A',
                ];
            });

            return $this->respondSuccess($formattedRecords);
        } catch (\Exception $e) {
            Log::error('Records error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch records', null, 500);
        }
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    private function getBreastfeedingCount()
    {
        return MaternalProfile::where('pregnancy_status', 'postpartum')->count();
    }

    private function getUnderweightCount()
    {
        return NutritionAssessment::where('nutrition_status', 'underweight')->count();
    }

    private function calculateCoverage()
    {
        $totalHouseholds = Household::count();
        $geotagged = DB::table('house_geotags')->distinct('household_id')->count();

        if ($totalHouseholds == 0) return 0;
        return round(($geotagged / $totalHouseholds) * 100);
    }

    private function getZoneHealthConcerns($zoneId)
    {
        $residentIds = DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->where('household_addresses.zone', $zoneId)
            ->where('resident_households.status', 'active')
            ->pluck('resident_households.resident_id');

        return [
            'pregnant' => MaternalProfile::whereIn('resident_id', $residentIds)
                ->where('pregnancy_status', 'pregnant')->count(),
            'underweight' => NutritionAssessment::whereIn('participant_id', function ($query) use ($residentIds) {
                $query->select('id')
                    ->from('program_participants')
                    ->whereIn('resident_id', $residentIds);
            })
                ->where('nutrition_status', 'underweight')->count(),
            'breastfeeding' => 0,
        ];
    }

    private function getZoneGenderDistribution($zoneId)
    {
        $residentIds = DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->where('household_addresses.zone', $zoneId)
            ->where('resident_households.status', 'active')
            ->pluck('resident_households.resident_id');

        $male = Resident::whereIn('id', $residentIds)->where('gender', 'Male')->count();
        $female = Resident::whereIn('id', $residentIds)->where('gender', 'Female')->count();

        return ['male' => $male, 'female' => $female];
    }

    private function getZoneAgeDistribution($zoneId)
    {
        $residentIds = DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->where('household_addresses.zone', $zoneId)
            ->where('resident_households.status', 'active')
            ->pluck('resident_households.resident_id');

        $residents = Resident::whereIn('id', $residentIds)->get();

        $ageGroups = [
            '0-12' => 0,
            '13-18' => 0,
            '19-35' => 0,
            '36-60' => 0,
            '60+' => 0,
        ];

        foreach ($residents as $resident) {
            $age = $resident->age;
            if ($age <= 12) $ageGroups['0-12']++;
            elseif ($age <= 18) $ageGroups['13-18']++;
            elseif ($age <= 35) $ageGroups['19-35']++;
            elseif ($age <= 60) $ageGroups['36-60']++;
            else $ageGroups['60+']++;
        }

        return $ageGroups;
    }

    private function buildReportData($demographics, $reportType)
    {
        $query = Resident::query();

        if (in_array('household', $demographics)) {
            $query->with('households');
        }

        if (in_array('pregnant', $demographics)) {
            $query->whereHas('maternalProfile', function ($q) {
                $q->where('pregnancy_status', 'pregnant');
            });
        }

        return $query->limit(100)->get()->toArray();
    }

    private function generateSummary($data)
    {
        return [
            'total_records' => count($data),
            'generated_at' => now()->toDateTimeString(),
        ];
    }
}
