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

    public function showRecord($id)
    {
        try {
            $resident = \App\Models\Resident::with([
                'households.address.barangayZone',
                'households.residents',
                'checkups',
                'maternalProfile',
            ])->find($id);

            if (!$resident) {
                return $this->respondNotFound('Record not found');
            }

            $household = $resident->households->first();
            $address   = $household?->address;
            $zone      = $address?->barangayZone;

            // -------- Vitals from the latest checkup --------
            $latestCheckup = $resident->checkups
                ->sortByDesc('checkup_date')
                ->first();

            $vitalSigns = [];
            if ($latestCheckup && is_array($latestCheckup->vital_signs)) {
                $vitalSigns = $latestCheckup->vital_signs;
            } elseif ($latestCheckup && is_string($latestCheckup->vital_signs)) {
                $decoded = json_decode($latestCheckup->vital_signs, true);
                if (is_array($decoded)) {
                    $vitalSigns = $decoded;
                }
            }

            // -------- Nutrition status (best-effort) --------
            $nutritionStatus = null;
            try {
                $nutrition = \App\Models\NutritionAssessment::whereHas(
                    'participant',
                    function ($q) use ($resident) {
                        $q->where('resident_id', $resident->id);
                    }
                )->latest('assessment_date')->first();

                if ($nutrition) {
                    $nutritionStatus = $nutrition->nutrition_status;
                }
            } catch (\Exception $e) {
                \Log::info('showRecord: nutrition lookup skipped', [
                    'resident_id' => $resident->id,
                    'error'       => $e->getMessage(),
                ]);
            }

            // -------- Pregnancy status --------
            $pregnancyStatus = $resident->maternalProfile?->pregnancy_status;

            // -------- Checkups (lightweight for list) --------
            $checkups = $resident->checkups
                ->sortByDesc('checkup_date')
                ->map(function ($c) {
                    return [
                        'id'           => $c->id,
                        'checkup_type' => $c->checkup_type,
                        'checkup_date' => $c->checkup_date
                            ? $c->checkup_date->toIso8601String()
                            : null,
                        'notes'        => $c->notes,
                        'assessment'   => $c->assessment,
                        'diagnosis'    => $c->diagnosis,
                    ];
                })
                ->values()
                ->all();

            // -------- Household members --------
            $householdMembers = [];
            if ($household) {
                $householdMembers = $household->residents
                    ->map(function ($r) {
                        return [
                            'id'        => $r->id,
                            'first_name' => $r->first_name,
                            'last_name'  => $r->last_name,
                            'full_name'  => $r->full_name,
                            'gender'     => $r->gender,
                            'age'        => $r->age,
                            'relationship_to_household' =>
                            $r->pivot->relationship_to_household ?? null,
                            'is_primary' => (bool) ($r->pivot->is_primary ?? false),
                        ];
                    })
                    ->values()
                    ->all();
            }

            // -------- Payload --------
            return $this->respondSuccess([
                // Identity
                'id'             => $resident->id,
                'resident_id'    => $resident->id,
                'resident_name'  => $resident->full_name,
                'first_name'     => $resident->first_name,
                'middle_name'    => $resident->middle_name,
                'last_name'      => $resident->last_name,
                'suffix'         => $resident->suffix,

                // Location
                'household_number' => $household?->household_number,
                'household_id'     => $household?->id,
                'address'          => $address?->street,
                'zone'             => $zone?->name,
                'zone_id'          => $address?->zone,

                // Demographics
                'gender'       => $resident->gender,
                'age'          => $resident->age,
                'birth_date'   => $resident->birth_date
                    ? $resident->birth_date->toDateString()
                    : null,
                'civil_status' => $resident->civil_status,
                'citizenship'  => $resident->citizenship,
                'phone_number' => $resident->phone_number,
                'occupation'   => $resident->occupation,
                'monthly_income' => $resident->monthly_income,
                'education_attainment' => $resident->education_attainment,

                // Health flags (keep the same keys as the list endpoint)
                'pregnancy_status' => $pregnancyStatus,
                'breastfeeding'    => false, // enrich if you have a lactating table
                'nutrition_status' => $nutritionStatus,
                'patient_type'     => null, // populate if you filter by type

                // Vitals (optional — screen shows them only if present)
                'blood_pressure' => $vitalSigns['blood_pressure'] ?? null,
                'weight'         => isset($vitalSigns['weight'])
                    ? (float) $vitalSigns['weight']
                    : null,
                'height'         => isset($vitalSigns['height'])
                    ? (float) $vitalSigns['height']
                    : null,
                'heart_rate'     => isset($vitalSigns['heart_rate'])
                    ? (int) $vitalSigns['heart_rate']
                    : null,
                'temperature'    => isset($vitalSigns['temperature'])
                    ? (float) $vitalSigns['temperature']
                    : null,
                'bmi'            => $vitalSigns['bmi'] ?? null,

                // Last checkup summary
                'last_checkup' => $latestCheckup?->checkup_date
                    ? $latestCheckup->checkup_date->toIso8601String()
                    : null,

                // Full checkup list (screen shows 5 most recent)
                'checkups' => $checkups,

                // Household members
                'household_members' => $householdMembers,
            ]);
        } catch (\Exception $e) {
            Log::error('Show record error: ' . $e->getMessage(), [
                'record_id' => $id,
                'trace'     => $e->getTraceAsString(),
            ]);

            return $this->respondError(
                'Failed to fetch record: ' . $e->getMessage(),
                null,
                500
            );
        }
    }

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
                        'births' => $this->getZoneBirths($zone->id),
                        'deaths' => $this->getZoneDeaths($zone->id),
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

    private function getZoneBirths($zoneId): int
    {
        $residentIds = DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->where('household_addresses.zone', $zoneId)
            ->where('resident_households.status', 'active')
            ->pluck('resident_households.resident_id');

        // Count residents born in the current year — proxy for "births registered this year".
        // Swap this with a `births` table query if you have one.
        return Resident::whereIn('id', $residentIds)
            ->whereYear('birth_date', now()->year)
            ->count();
    }

    private function getZoneDeaths($zoneId): int
    {
        // If you have a deaths table, query it here. For now, use resident status.
        $residentIds = DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->where('household_addresses.zone', $zoneId)
            ->pluck('resident_households.resident_id');

        return Resident::whereIn('id', $residentIds)
            ->where('status', 'deceased')
            ->count();
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

        // ✅ Detailed 15-bucket age distribution
        $ageGroups = [
            '1-2'     => 0,
            '3-4'     => 0,
            '5-9'     => 0,
            '10-14'   => 0,
            '15-19'   => 0,
            '20-24'   => 0,
            '25-29'   => 0,
            '30-34'   => 0,
            '35-39'   => 0,
            '40-44'   => 0,
            '45-49'   => 0,
            '50-54'   => 0,
            '55-59'   => 0,
            '60-64'   => 0,
            '65 above' => 0,
        ];

        foreach ($residents as $resident) {
            $age = $resident->age;
            if ($age === null) continue;

            if ($age <= 2)       $ageGroups['1-2']++;
            elseif ($age <= 4)   $ageGroups['3-4']++;
            elseif ($age <= 9)   $ageGroups['5-9']++;
            elseif ($age <= 14)  $ageGroups['10-14']++;
            elseif ($age <= 19)  $ageGroups['15-19']++;
            elseif ($age <= 24)  $ageGroups['20-24']++;
            elseif ($age <= 29)  $ageGroups['25-29']++;
            elseif ($age <= 34)  $ageGroups['30-34']++;
            elseif ($age <= 39)  $ageGroups['35-39']++;
            elseif ($age <= 44)  $ageGroups['40-44']++;
            elseif ($age <= 49)  $ageGroups['45-49']++;
            elseif ($age <= 54)  $ageGroups['50-54']++;
            elseif ($age <= 59)  $ageGroups['55-59']++;
            elseif ($age <= 64)  $ageGroups['60-64']++;
            else                 $ageGroups['65 above']++;
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
