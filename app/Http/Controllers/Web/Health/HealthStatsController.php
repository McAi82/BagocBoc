<?php
// app/Http/Controllers/Web/Health/HealthStatsController.php

namespace App\Http\Controllers\Web\Health;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\ProgramParticipant;
use App\Models\MaternalProfile;
use App\Models\BarangayZone;
use App\Models\Household;
use App\Models\NutritionAssessment;
use App\Models\PatientRecord;
use App\Models\CheckupRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HealthStatsController extends Controller
{
    /**
     * Get health dashboard statistics
     */
    public function index()
    {
        try {
            // ✅ Get patient records by type
            $patientTypes = [
                'pregnant' => PatientRecord::where('patient_type', 'pregnant')->count(),
                'child' => PatientRecord::where('patient_type', 'child')->count(),
                'lactating' => PatientRecord::where('patient_type', 'lactating')->count(),
                'senior' => PatientRecord::where('patient_type', 'senior')->count(),
                'ncd' => PatientRecord::where('patient_type', 'ncd')->count(),
            ];

            $totalPatients = array_sum($patientTypes);

            // ✅ Get today's checkups
            $todayCheckups = CheckupRecord::whereDate('checkup_date', today())->count();

            // ✅ Get pending follow-ups (follow_up_date in future)
            $pendingFollowups = CheckupRecord::where('follow_up_date', '>', today())
                ->where('status', 'completed')
                ->count();

            // ✅ Get gender distribution from patient records
            $genderStats = DB::table('patient_records')
                ->join('residents', 'patient_records.resident_id', '=', 'residents.id')
                ->selectRaw("
                    COUNT(CASE WHEN residents.gender = 'Male' THEN 1 END) as male,
                    COUNT(CASE WHEN residents.gender = 'Female' THEN 1 END) as female
                ")
                ->where('patient_records.status', 'active')
                ->first();

            $stats = [
                'totalPatients' => $totalPatients,
                'total_patients' => $totalPatients,
                'total' => $totalPatients,
                'pregnant' => $patientTypes['pregnant'],
                'children' => $patientTypes['child'],
                'child' => $patientTypes['child'],
                'lactating' => $patientTypes['lactating'],
                'senior' => $patientTypes['senior'],
                'ncd' => $patientTypes['ncd'],
                'todayCheckups' => $todayCheckups,
                'today_checkups' => $todayCheckups,
                'pendingFollowups' => $pendingFollowups,
                'pending_followups' => $pendingFollowups,
                'male' => $genderStats->male ?? 0,
                'female' => $genderStats->female ?? 0,
            ];

            Log::info('Health stats retrieved', $stats);

            return response()->json([
                'success' => true,
                'message' => 'Health statistics retrieved successfully',
                'data' => $stats
            ], 200);
        } catch (\Exception $e) {
            Log::error('Health stats error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            // ✅ Return default values on error
            return response()->json([
                'success' => true,
                'message' => 'Health statistics retrieved with defaults',
                'data' => [
                    'totalPatients' => 0,
                    'total_patients' => 0,
                    'total' => 0,
                    'pregnant' => 0,
                    'children' => 0,
                    'child' => 0,
                    'lactating' => 0,
                    'senior' => 0,
                    'ncd' => 0,
                    'todayCheckups' => 0,
                    'today_checkups' => 0,
                    'pendingFollowups' => 0,
                    'pending_followups' => 0,
                    'male' => 0,
                    'female' => 0,
                ]
            ], 200);
        }
    }

    /**
     * Get zone statistics
     */
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
                        'zone_id'                   => $zone->id,
                        'zone_name'                 => $zone->name,
                        'population'                => $residentCount,
                        'households'                => $zone->households_count,
                        'geotagged'                 => $geotagged,
                        'health_concerns'           => $healthConcerns,
                        'gender_distribution'       => $genderDistribution,
                        'age_distribution'          => $ageDistribution,
                        'births'                    => $this->getZoneBirths($zone->id),
                        'deaths'                    => $this->getZoneDeaths($zone->id),
                        'latitude'                  => 8.4198 + ($zone->id * 0.002),
                        'longitude'                 => 124.5022 + ($zone->id * 0.002),
                    ];
                });

            return $this->respondSuccess($zones);
        } catch (\Exception $e) {
            Log::error('Zone stats error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch zone statistics', null, 500);
        }
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
                ->where('pregnancy_status', 'pregnant')
                ->count(),
            'underweight' => NutritionAssessment::whereIn('participant_id', function ($query) use ($residentIds) {
                $query->select('id')
                    ->from('program_participants')
                    ->whereIn('resident_id', $residentIds);
            })
                ->where('nutrition_status', 'underweight')
                ->count(),
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

        return [
            'male' => $male,
            'female' => $female,
        ];
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
            '1-2'      => 0,
            '3-4'      => 0,
            '5-9'      => 0,
            '10-14'    => 0,
            '15-19'    => 0,
            '20-24'    => 0,
            '25-29'    => 0,
            '30-34'    => 0,
            '35-39'    => 0,
            '40-44'    => 0,
            '45-49'    => 0,
            '50-54'    => 0,
            '55-59'    => 0,
            '60-64'    => 0,
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

    private function getZoneBirths($zoneId): int
    {
        $residentIds = DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->where('household_addresses.zone', $zoneId)
            ->where('resident_households.status', 'active')
            ->pluck('resident_households.resident_id');

        return Resident::whereIn('id', $residentIds)
            ->whereYear('birth_date', now()->year)
            ->count();
    }

    private function getZoneDeaths($zoneId): int
    {
        $residentIds = DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->where('household_addresses.zone', $zoneId)
            ->pluck('resident_households.resident_id');

        return Resident::whereIn('id', $residentIds)
            ->where('status', 'deceased')
            ->count();
    }
}
