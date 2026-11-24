<?php
// app/Http/Controllers/Web/BNS/BNSController.php

namespace App\Http\Controllers\Web\BNS;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\Household;
use App\Models\BarangayZone;
use App\Models\HouseGeotag;
use App\Models\HouseholdAddress;
use App\Models\PatientRecord;
use App\Models\CheckupRecord;
use App\Models\RecordActivityLog;
use App\Models\MaternalProfile;
use App\Models\LactatingRecord;
use App\Models\ProgramParticipant;
use App\Models\OptPlusAssessment;
use App\Support\ReportPeriod;
use App\Support\WhoWeightForAge;
use App\Traits\SendsNotifications;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class BNSController extends Controller
{
    use SendsNotifications;

    /**
     * Get BNS dashboard statistics
     */
    public function dashboardStats()
    {
        try {
            $stats = [
                'total_records' => RecordActivityLog::count(),
                'total_households' => Household::count(),
                'total_zones' => BarangayZone::count(),
                'total_demographics' => 7,
                'pending_records' => RecordActivityLog::where('data_status', 'Pending')->count(),
                'approved_records' => RecordActivityLog::where('data_status', 'Approved')->count(),
            ];

            return $this->respondSuccess($stats);
        } catch (\Exception $e) {
            Log::error('BNS Dashboard Stats Error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch dashboard stats: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Get BHW collected records with pagination and filters
     */
    public function getRecords(Request $request)
    {
        try {
            $query = RecordActivityLog::with(['encoder'])
                ->whereIn('action', ['Created Residents', 'Added Household', 'Added Opt Plus Records', 'Added Patient Record']);

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('details', 'LIKE', "%{$search}%")
                        ->orWhere('action', 'LIKE', "%{$search}%")
                        ->orWhereHas('encoder', function ($eq) use ($search) {
                            $eq->where('email', 'LIKE', "%{$search}%");
                        });
                });
            }

            if ($request->has('type')) {
                $query->where('record_type', 'LIKE', "%{$request->type}%");
            }

            if ($request->has('date_from')) {
                $query->whereDate('created_at', '>=', $request->date_from);
            }
            if ($request->has('date_to')) {
                $query->whereDate('created_at', '<=', $request->date_to);
            }

            $records = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 20);

            $records->getCollection()->transform(function ($log) {
                return [
                    'id' => $log->id,
                    'type' => $this->getRecordType($log->record_type),
                    'household_number' => $this->getHouseholdNumber($log->record),
                    'family_name' => $this->getFamilyName($log->record),
                    'count' => $log->record ? 1 : 0,
                    'submitted_by' => $log->encoder ? $log->encoder->email : 'Unknown',
                    'submitted_at' => $log->created_at,
                    'status' => strtolower($log->data_status ?? 'pending'),
                    'details' => $log->details,
                ];
            });

            return $this->respondSuccess($records);
        } catch (\Exception $e) {
            Log::error('BNS Get Records Error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch records: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Get single record details
     */
    public function getRecord($id)
    {
        try {
            $log = RecordActivityLog::with(['encoder', 'record'])->find($id);

            if (!$log) {
                return $this->respondNotFound('Record not found');
            }

            $record = [
                'id' => $log->id,
                'type' => $this->getRecordType($log->record_type),
                'action' => $log->action,
                'details' => $log->details,
                'status' => strtolower($log->data_status ?? 'pending'),
                'submitted_by' => $log->encoder ? $log->encoder->email : 'Unknown',
                'submitted_at' => $log->created_at,
                'data' => $log->record,
            ];

            return $this->respondSuccess($record);
        } catch (\Exception $e) {
            Log::error('BNS Get Record Error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch record: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Export records to CSV
     */
    public function exportRecords(Request $request)
    {
        $records = PatientRecord::all();

        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="bns_records_' . now()->format('Y-m-d') . '.csv"',
        ];

        $callback = function () use ($records) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['ID', 'Patient Type', 'Resident', 'Created At']);
            foreach ($records as $r) {
                fputcsv($out, [
                    $r->id,
                    $r->patient_type,
                    $r->resident?->full_name,
                    $r->created_at,
                ]);
            }
            fclose($out);
        };

        return response()->streamDownload($callback, 'bns_records.csv', $headers);
    }

    /**
     * Get consolidated demographic data
     */
    public function consolidateDemographic(Request $request, $type)
    {
        try {
            $validTypes = ['household', 'family', 'gender', 'age', 'pregnant', 'breastfeeding', 'child-nutrition'];

            if (!in_array($type, $validTypes)) {
                return $this->respondError('Invalid demographic type', null, 422);
            }

            $data = $this->getConsolidatedData($type, $request);

            return $this->respondSuccess($data);
        } catch (\Exception $e) {
            Log::error('BNS Consolidate Demographic Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return $this->respondError('Failed to consolidate data: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * ✅ Get zone statistics for GIS map (single zone)
     */
    public function getZoneStatistics($zoneId)
    {
        try {
            $zone = BarangayZone::find($zoneId);

            if (!$zone) {
                return $this->respondNotFound('Zone not found');
            }

            $householdIds = HouseholdAddress::where('zone', $zoneId)->pluck('id');
            $householdCount = Household::whereIn('address_id', $householdIds)->count();

            $residentIds = DB::table('resident_households')
                ->join('households', 'resident_households.household_id', '=', 'households.id')
                ->whereIn('households.address_id', $householdIds)
                ->where('resident_households.status', 'active')
                ->pluck('resident_households.resident_id')
                ->unique();

            $residents = Resident::whereIn('id', $residentIds)->get();
            $populationCount = $residents->count();

            $geotagged = HouseGeotag::whereIn('household_id', function ($query) use ($householdIds) {
                $query->select('id')->from('households')->whereIn('address_id', $householdIds);
            })->count();

            $geotaggingCoverage = $householdCount > 0 ? round(($geotagged / $householdCount) * 100) : 0;

            $healthConcernCount = PatientRecord::whereIn('resident_id', $residentIds)
                ->where('status', 'active')->count();

            $healthConcernsPercentage = $populationCount > 0
                ? round(($healthConcernCount / $populationCount) * 100)
                : 0;

            $maleCount = $residents->where('gender', 'Male')->count();
            $femaleCount = $residents->where('gender', 'Female')->count();

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

            // ✅ Births (residents born this year)
            $births = Resident::whereIn('id', $residentIds)
                ->whereYear('birth_date', now()->year)
                ->count();

            // ✅ Deaths (residents with status = deceased)
            $deaths = Resident::whereIn('id', $residentIds)
                ->where('status', 'deceased')
                ->count();

            $statistics = [
                'zone_id' => $zone->id,
                'zone_name' => $zone->name,
                'total_population' => $populationCount,
                'total_households' => $householdCount,
                'geotagging_coverage' => $geotaggingCoverage,
                'health_concerns_percentage' => $healthConcernsPercentage,
                'male_population' => $maleCount,
                'female_population' => $femaleCount,
                'age_groups' => $ageGroups,
                'births' => $births,   // ✅ new
                'deaths' => $deaths,   // ✅ new
                'last_updated' => now()->toISOString(),
            ];

            return $this->respondSuccess($statistics);
        } catch (\Exception $e) {
            Log::error('BNS Get Zone Statistics Error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch zone statistics: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * ✅ Get all zone statistics (used by GIS map sidebar)
     */
    public function getAllZoneStatistics()
    {
        try {
            $zones = BarangayZone::all();
            $statistics = [];

            foreach ($zones as $zone) {
                $householdIds = HouseholdAddress::where('zone', $zone->id)->pluck('id');
                $householdCount = Household::whereIn('address_id', $householdIds)->count();

                $residentIds = DB::table('resident_households')
                    ->join('households', 'resident_households.household_id', '=', 'households.id')
                    ->whereIn('households.address_id', $householdIds)
                    ->where('resident_households.status', 'active')
                    ->pluck('resident_households.resident_id')
                    ->unique();

                $residents = Resident::whereIn('id', $residentIds)->get();
                $populationCount = $residents->count();

                $geotagged = HouseGeotag::whereIn('household_id', function ($query) use ($householdIds) {
                    $query->select('id')->from('households')->whereIn('address_id', $householdIds);
                })->count();

                $geotaggingCoverage = $householdCount > 0 ? round(($geotagged / $householdCount) * 100) : 0;

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

                // ✅ Births & Deaths
                $births = Resident::whereIn('id', $residentIds)
                    ->whereYear('birth_date', now()->year)
                    ->count();

                $deaths = Resident::whereIn('id', $residentIds)
                    ->where('status', 'deceased')
                    ->count();

                $statistics[] = [
                    'zone_id' => $zone->id,
                    'zone_name' => $zone->name,
                    'total_population' => $populationCount,
                    'total_households' => $householdCount,
                    'geotagging_coverage' => $geotaggingCoverage,
                    'health_concerns_percentage' => 0,
                    'male_population' => $residents->where('gender', 'Male')->count(),
                    'female_population' => $residents->where('gender', 'Female')->count(),
                    'age_groups' => $ageGroups,
                    'births' => $births,   // ✅ new
                    'deaths' => $deaths,   // ✅ new
                    'last_updated' => now()->toISOString(),
                ];
            }

            return $this->respondSuccess($statistics);
        } catch (\Exception $e) {
            Log::error('BNS Get All Zone Statistics Error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch zone statistics: ' . $e->getMessage(), null, 500);
        }
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    private function getRecordType($recordType)
    {
        if (str_contains($recordType, 'Resident')) return 'household';
        if (str_contains($recordType, 'Household')) return 'household';
        if (str_contains($recordType, 'OptPlus')) return 'health';
        if (str_contains($recordType, 'Patient')) return 'health';
        if (str_contains($recordType, 'Maternal')) return 'health';
        if (str_contains($recordType, 'Nutrition')) return 'health';
        return 'other';
    }

    private function getHouseholdNumber($record)
    {
        if (!$record) return 'N/A';

        // Household records have household_number directly
        if (isset($record->household_number)) return $record->household_number;

        // Resident records — look up via their household pivot
        if ($record instanceof \App\Models\Resident) {
            $household = $record->households()->first();
            if ($household && $household->household_number) {
                return $household->household_number;
            }
        }

        return 'N/A';
    }

    private function getFamilyName($record)
    {
        if (!$record) return 'Unknown';

        // Direct name fields (e.g. Resident records)
        if (isset($record->last_name) && $record->last_name) return $record->last_name;
        if (isset($record->family_name) && $record->family_name) return $record->family_name;

        // Household records — look up the head of household
        if ($record instanceof \App\Models\Household) {
            $head = $record->residents()
                ->wherePivot('is_primary', true)
                ->first()
                ?? $record->residents()->first();

            if ($head && $head->last_name) {
                return $head->last_name;
            }
        }

        return 'Unknown';
    }

    private function getAgeConsolidation($request)
    {
        try {
            // Population as of the end of the period: registered by then, already born by then,
            // age counted on that date.
            $p = ReportPeriod::fromRequest($request);
            $residents = Resident::whereNotNull('birth_date')
                ->where('created_at', '<=', $p->asOf)
                ->where('birth_date', '<=', $p->asOf)
                ->get(['id', 'birth_date']);
            $ageGroups = ['0-12' => 0, '13-18' => 0, '19-35' => 0, '36-60' => 0, '60+' => 0];

            foreach ($residents as $resident) {
                $age = (int) Carbon::parse($resident->birth_date)->diffInYears($p->asOf);
                if ($age <= 12) $ageGroups['0-12']++;
                elseif ($age <= 18) $ageGroups['13-18']++;
                elseif ($age <= 35) $ageGroups['19-35']++;
                elseif ($age <= 60) $ageGroups['36-60']++;
                else $ageGroups['60+']++;
            }

            $total = array_sum($ageGroups);
            $breakdown = [];
            foreach ($ageGroups as $group => $count) {
                $breakdown[] = [
                    'category' => $group . ' years',
                    'count' => $count,
                    'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
                ];
            }

            return [
                'demographic' => 'age',
                'total' => $total,
                'breakdown' => $breakdown,
                'date_range' => ReportPeriod::fromRequest($request)->dateRange(),
                'period' => ReportPeriod::fromRequest($request)->toArray(),
                'metadata' => ['generated_at' => now()->toISOString(), 'source' => 'Resident Records'],
            ];
        } catch (\Exception $e) {
            Log::error('BNS Age Consolidation Error: ' . $e->getMessage());
            return $this->getDefaultConsolidation($request);
        }
    }

    private function getHouseholdConsolidation($request)
    {
        try {
            $p = ReportPeriod::fromRequest($request);
            $zones = BarangayZone::all();
            $breakdown = [];
            $total = 0;

            foreach ($zones as $zone) {
                $count = HouseholdAddress::where('zone', $zone->id)->where('created_at', '<=', $p->asOf)->count();
                $breakdown[] = ['category' => $zone->name, 'count' => $count, 'percentage' => 0];
                $total += $count;
            }

            foreach ($breakdown as &$item) {
                $item['percentage'] = $total > 0 ? round(($item['count'] / $total) * 100, 1) : 0;
            }

            return [
                'demographic' => 'household',
                'total' => $total,
                'breakdown' => $breakdown,
                'date_range' => ReportPeriod::fromRequest($request)->dateRange(),
                'period' => ReportPeriod::fromRequest($request)->toArray(),
                'metadata' => ['generated_at' => now()->toISOString(), 'source' => 'Household Records'],
            ];
        } catch (\Exception $e) {
            Log::error('BNS Household Consolidation Error: ' . $e->getMessage());
            return $this->getDefaultConsolidation($request);
        }
    }

    private function getFamilyConsolidation($request)
    {
        try {
            $p = ReportPeriod::fromRequest($request);
            $households = Household::where('created_at', '<=', $p->asOf)->get();
            $sizes = ['1 member' => 0, '2-3 members' => 0, '4-5 members' => 0, '6+ members' => 0];

            foreach ($households as $household) {
                $count = $household->residents()->count();
                if ($count <= 1) $sizes['1 member']++;
                elseif ($count <= 3) $sizes['2-3 members']++;
                elseif ($count <= 5) $sizes['4-5 members']++;
                else $sizes['6+ members']++;
            }

            $total = array_sum($sizes);
            $breakdown = [];
            foreach ($sizes as $category => $count) {
                $breakdown[] = [
                    'category' => $category,
                    'count' => $count,
                    'percentage' => $total > 0 ? round(($count / $total) * 100, 1) : 0,
                ];
            }

            return [
                'demographic' => 'family',
                'total' => $total,
                'breakdown' => $breakdown,
                'date_range' => ReportPeriod::fromRequest($request)->dateRange(),
                'period' => ReportPeriod::fromRequest($request)->toArray(),
                'metadata' => ['generated_at' => now()->toISOString(), 'source' => 'Household Records'],
            ];
        } catch (\Exception $e) {
            Log::error('BNS Family Consolidation Error: ' . $e->getMessage());
            return $this->getDefaultConsolidation($request);
        }
    }

    private function getGenderConsolidation($request)
    {
        try {
            $p = ReportPeriod::fromRequest($request);
            $maleCount = Resident::where('gender', 'Male')->where('created_at', '<=', $p->asOf)->count();
            $femaleCount = Resident::where('gender', 'Female')->where('created_at', '<=', $p->asOf)->count();
            $total = $maleCount + $femaleCount;

            $breakdown = [
                ['category' => 'Male', 'count' => $maleCount, 'percentage' => $total > 0 ? round(($maleCount / $total) * 100, 1) : 0],
                ['category' => 'Female', 'count' => $femaleCount, 'percentage' => $total > 0 ? round(($femaleCount / $total) * 100, 1) : 0],
            ];

            return [
                'demographic' => 'gender',
                'total' => $total,
                'breakdown' => $breakdown,
                'date_range' => ReportPeriod::fromRequest($request)->dateRange(),
                'period' => ReportPeriod::fromRequest($request)->toArray(),
                'metadata' => ['generated_at' => now()->toISOString(), 'source' => 'Resident Records'],
            ];
        } catch (\Exception $e) {
            Log::error('BNS Gender Consolidation Error: ' . $e->getMessage());
            return $this->getDefaultConsolidation($request);
        }
    }

    private function getPregnantConsolidation($request)
    {
        try {
            $p = ReportPeriod::fromRequest($request);
            $zones = BarangayZone::all();
            $breakdown = [];
            $total = 0;

            foreach ($zones as $zone) {
                $zoneResidentIds = DB::table('resident_households')
                    ->join('households', 'resident_households.household_id', '=', 'households.id')
                    ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
                    ->where('household_addresses.zone', $zone->id)
                    ->where('resident_households.status', 'active')
                    ->pluck('resident_households.resident_id');

                $count = MaternalProfile::whereIn('resident_id', $zoneResidentIds)
                    ->where('pregnancy_status', 'pregnant')
                    ->whereBetween('created_at', [$p->from, $p->to])->count();

                $breakdown[] = ['category' => $zone->name, 'count' => $count, 'percentage' => 0];
                $total += $count;
            }

            foreach ($breakdown as &$item) {
                $item['percentage'] = $total > 0 ? round(($item['count'] / $total) * 100, 1) : 0;
            }

            return [
                'demographic' => 'pregnant',
                'total' => $total,
                'breakdown' => $breakdown,
                'date_range' => ReportPeriod::fromRequest($request)->dateRange(),
                'period' => ReportPeriod::fromRequest($request)->toArray(),
                'metadata' => ['generated_at' => now()->toISOString(), 'source' => 'Maternal Records'],
            ];
        } catch (\Exception $e) {
            Log::error('BNS Pregnant Consolidation Error: ' . $e->getMessage());
            return $this->getDefaultConsolidation($request);
        }
    }

    private function getBreastfeedingConsolidation($request)
    {
        try {
            $p = ReportPeriod::fromRequest($request);
            $zones = BarangayZone::all();
            $breakdown = [];
            $total = 0;

            foreach ($zones as $zone) {
                $zoneResidentIds = DB::table('resident_households')
                    ->join('households', 'resident_households.household_id', '=', 'households.id')
                    ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
                    ->where('household_addresses.zone', $zone->id)
                    ->where('resident_households.status', 'active')
                    ->pluck('resident_households.resident_id');

                $count = LactatingRecord::whereIn('resident_id', $zoneResidentIds)
                    ->whereBetween('created_at', [$p->from, $p->to])->count();
                $breakdown[] = ['category' => $zone->name, 'count' => $count, 'percentage' => 0];
                $total += $count;
            }

            foreach ($breakdown as &$item) {
                $item['percentage'] = $total > 0 ? round(($item['count'] / $total) * 100, 1) : 0;
            }

            return [
                'demographic' => 'breastfeeding',
                'total' => $total,
                'breakdown' => $breakdown,
                'date_range' => ReportPeriod::fromRequest($request)->dateRange(),
                'period' => ReportPeriod::fromRequest($request)->toArray(),
                'metadata' => ['generated_at' => now()->toISOString(), 'source' => 'Lactating Records'],
            ];
        } catch (\Exception $e) {
            Log::error('BNS Breastfeeding Consolidation Error: ' . $e->getMessage());
            return $this->getDefaultConsolidation($request);
        }
    }

    /**
     * Child nutrition (0-23 months) — from each child's latest OPT Plus assessment.
     * Status = WHO weight-for-age: Underweight (below -2 SD), Normal, Overweight (above +2 SD).
     */
    private function getChildNutritionConsolidation($request)
    {
        try {
            $p = ReportPeriod::fromRequest($request);

            // 0-23 months as of the end of the period (born by then, still under 2 years old)
            $children = Resident::whereNotNull('birth_date')
                ->where('birth_date', '<=', $p->asOf)
                ->where('birth_date', '>', $p->asOf->copy()->subMonths(24))
                ->where(function ($q) {
                    $q->whereNull('vital_status')->orWhere('vital_status', '!=', 'deceased');
                })
                ->where(function ($q) {
                    $q->whereNull('status')->orWhere('status', '!=', 'deceased');
                })
                ->get(['id', 'gender', 'birth_date']);

            // Latest OPT Plus assessment per child INSIDE the period, by assessment_date then id
            $latest = OptPlusAssessment::whereIn('resident_id', $children->pluck('id'))
                ->whereBetween('assessment_date', [$p->from->toDateString(), $p->to->toDateString()])
                ->orderBy('assessment_date')
                ->orderBy('id')
                ->get()
                ->groupBy('resident_id')
                ->map(fn($group) => $group->last());

            $total = $children->count();
            $pct   = fn($n) => $total > 0 ? round(($n / $total) * 100, 1) : 0;

            $status = [
                WhoWeightForAge::UNDERWEIGHT => 0,
                WhoWeightForAge::NORMAL      => 0,
                WhoWeightForAge::OVERWEIGHT  => 0,
                'Not Assessed'               => 0, // no OPT Plus record in this period
                'Cannot Classify'            => 0, // has a record, but missing gender / invalid date or weight
            ];
            $brackets = ['0-5 months' => 0, '6-11 months' => 0, '12-17 months' => 0, '18-23 months' => 0];
            $sex      = ['Male' => 0, 'Female' => 0];

            foreach ($children as $child) {
                $birth = Carbon::parse($child->birth_date);

                // Age bracket at the end of the period
                $months = max(0, (int) $birth->diffInMonths($p->asOf));
                if ($months <= 5)       $brackets['0-5 months']++;
                elseif ($months <= 11)  $brackets['6-11 months']++;
                elseif ($months <= 17)  $brackets['12-17 months']++;
                else                    $brackets['18-23 months']++;

                if (isset($sex[$child->gender])) $sex[$child->gender]++;

                // Nutrition status from the latest OPT Plus record
                $a = $latest->get($child->id);
                if (!$a) {
                    $status['Not Assessed']++;
                    continue;
                }

                $assessedOn = Carbon::parse($a->assessment_date);
                $result = null;

                if ($assessedOn->gte($birth)) {
                    // Age in completed months at the time of weighing
                    $ageAtAssessment = (int) $birth->diffInMonths($assessedOn);
                    $result = WhoWeightForAge::classify((float) $a->weight_kg, $ageAtAssessment, $child->gender);
                }

                $status[$result ?? 'Cannot Classify']++;
            }

            $breakdown = [];
            foreach ($status as $label => $count) {
                // Hide "Cannot Classify" when there is nothing in it; always show the rest
                if ($label === 'Cannot Classify' && $count === 0) continue;
                $breakdown[] = ['category' => $label, 'count' => $count, 'percentage' => $pct($count)];
            }

            $toRows = fn(array $counts) => collect($counts)
                ->map(fn($c, $k) => ['category' => $k, 'count' => $c, 'percentage' => $pct($c)])
                ->values()
                ->all();

            return [
                'demographic' => 'child-nutrition',
                'total'       => $total,
                'breakdown'   => $breakdown,
                'sections'    => [
                    'age_brackets' => $toRows($brackets),
                    'sex'          => $toRows($sex),
                ],
                'date_range' => ReportPeriod::fromRequest($request)->dateRange(),
                'period' => ReportPeriod::fromRequest($request)->toArray(),
                'metadata'   => ['generated_at' => now()->toISOString(), 'source' => 'OPT Plus Assessments (children 0-23 months, WHO weight-for-age)'],
            ];
        } catch (\Exception $e) {
            Log::error('BNS Child Nutrition Consolidation Error: ' . $e->getMessage());
            return $this->getDefaultConsolidation($request);
        }
    }

    private function getDefaultConsolidation($request)
    {
        return [
            'demographic' => 'unknown',
            'total' => 0,
            'breakdown' => [],
            'date_range' => ReportPeriod::fromRequest($request)->dateRange(),
            'period' => ReportPeriod::fromRequest($request)->toArray(),
            'metadata' => ['generated_at' => now()->toISOString(), 'source' => 'No Data'],
        ];
    }

    /**
     * ✅ Generate report - notifies Captains and Barangay Secretary
     */
    public function generateReport(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'demographic' => 'required|string|in:household,family,gender,age,pregnant,breastfeeding,child-nutrition,all',
                'generate_all' => 'required|boolean',
                'period' => 'nullable|string|in:monthly,quarterly,yearly',
                'year' => 'nullable|integer|min:2000|max:2100',
                'month' => 'nullable|integer|min:1|max:12',
                'quarter' => 'nullable|integer|min:1|max:4',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $demographic = $request->demographic;
            $generateAll = $request->generate_all;
            $reports = [];
            $reportIds = [];

            if ($generateAll || $demographic === 'all') {
                $types = ['household', 'family', 'gender', 'age', 'pregnant', 'breastfeeding', 'child-nutrition'];

                foreach ($types as $type) {
                    $data = $this->getConsolidatedData($type, $request);
                    $report = $this->createReport($type, $data);
                    $reports[] = $report;
                    $reportIds[] = $report['id'];
                }

                RecordActivityLog::create([
                    'encoded_by' => Auth::id(),
                    'record_id' => 0,
                    'record_type' => 'BNS Report',
                    'action' => 'Generated All Reports',
                    'data_status' => 'Completed',
                    'details' => 'Generated all ' . count($types) . ' demographic reports (' . ReportPeriod::fromRequest($request)->label . ')',
                ]);

                $this->notifyRoles(
                    ['Barangay Captain', 'Barangay Secretary'],
                    '📊 New Demographic Report Available',
                    "A BNS demographic report package (" . count($reports) . " reports) has been generated and is ready for review.",
                    'report',
                    'normal',
                    '/reports/bns',
                    Auth::id()
                );

                return response()->json([
                    'success' => true,
                    'message' => 'All reports generated successfully',
                    'data' => [
                        'reports' => $reports,
                        'report_ids' => $reportIds,
                        'report_id' => $reportIds[0] ?? null,
                        'total' => count($reports),
                    ]
                ], 200);
            } else {
                $data = $this->getConsolidatedData($demographic, $request);
                $report = $this->createReport($demographic, $data);

                RecordActivityLog::create([
                    'encoded_by' => Auth::id(),
                    'record_id' => 0,
                    'record_type' => 'BNS Report',
                    'action' => 'Generated Report',
                    'data_status' => 'Completed',
                    'details' => "Generated {$demographic} demographic report (" . ReportPeriod::fromRequest($request)->label . ")",
                ]);

                $this->notifyRoles(
                    ['Barangay Captain', 'Barangay Secretary'],
                    '📊 New Demographic Report Available',
                    "A new {$demographic} demographic report has been generated and is ready for review.",
                    'report',
                    'normal',
                    '/reports/bns',
                    Auth::id()
                );

                return response()->json([
                    'success' => true,
                    'message' => 'Report generated successfully',
                    'data' => [
                        'report' => $report,
                        'report_id' => $report['id'],
                    ]
                ], 200);
            }
        } catch (\Exception $e) {
            Log::error('BNS Generate Report Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate report: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a specific report by ID
     */
    public function getReport(Request $request, $id)
    {
        try {
            $demographic = $this->getDemographicFromId($id, $request);

            if (!$demographic) {
                return response()->json([
                    'success' => false,
                    'message' => 'Report not found',
                ], 404);
            }

            $data = $this->getConsolidatedData($demographic, $request);
            $report = $this->createReport($demographic, $data);
            $report['id'] = $id;

            return response()->json([
                'success' => true,
                'message' => 'Report retrieved successfully',
                'data' => $report,
            ], 200);
        } catch (\Exception $e) {
            Log::error('BNS Get Report Error: ' . $e->getMessage());

            return response()->json([
                'success' => true,
                'message' => 'Report retrieved with defaults',
                'data' => [
                    'id' => $id,
                    'title' => 'Demographic Report',
                    'demographic' => 'general',
                    'generated_at' => now()->toISOString(),
                    'status' => 'generated',
                    'data' => ['total' => 0, 'breakdown' => []],
                ],
            ], 200);
        }
    }

    /**
     * Download report
     */
    public function downloadReport(Request $request, $id)
    {
        try {
            $demographic = $this->getDemographicFromId($id, $request);
            $data = $this->getConsolidatedData($demographic ?? 'general', $request);

            $content = "Barangay Bagocboc - Demographic Report\n";
            $content .= "============================\n\n";
            $content .= "Report ID: " . $id . "\n";
            $content .= "Period: " . ($data['period']['label'] ?? '') . "\n";
            $content .= "Generated: " . now()->toDateTimeString() . "\n";
            $content .= "Demographic: " . ($demographic ?? 'General') . "\n\n";
            $content .= "Summary:\n--------\n";
            $content .= "Total Records: " . ($data['total'] ?? 0) . "\n\n";

            if (isset($data['breakdown']) && is_array($data['breakdown'])) {
                $content .= "Breakdown:\n----------\n";
                foreach ($data['breakdown'] as $item) {
                    $content .= $item['category'] . ": " . $item['count'] . " (" . number_format($item['percentage'], 1) . "%)\n";
                }
            }

            $filename = 'report_' . $id . '_' . date('Y-m-d') . '.txt';

            return response($content)
                ->header('Content-Type', 'text/plain')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
        } catch (\Exception $e) {
            Log::error('BNS Download Report Error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to download report: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function getDemographicFromId($id, $request = null)
    {
        $demographics = ['household', 'family', 'gender', 'age', 'pregnant', 'breastfeeding', 'child-nutrition'];
        // Reports are not stored: the page passes ?demographic=...&period=...&year=... to regenerate the same report
        if ($request && in_array($request->query('demographic'), $demographics, true)) {
            return $request->query('demographic');
        }
        $index = is_numeric($id) ? (intval($id) % count($demographics)) : 0;
        return $demographics[$index] ?? 'general';
    }

    private function getConsolidatedData($type, $request)
    {
        try {
            switch ($type) {
                case 'household':
                    return $this->getHouseholdConsolidation($request);
                case 'family':
                    return $this->getFamilyConsolidation($request);
                case 'gender':
                    return $this->getGenderConsolidation($request);
                case 'age':
                    return $this->getAgeConsolidation($request);
                case 'pregnant':
                    return $this->getPregnantConsolidation($request);
                case 'breastfeeding':
                    return $this->getBreastfeedingConsolidation($request);
                case 'child-nutrition':
                    return $this->getChildNutritionConsolidation($request);
                default:
                    return $this->getDefaultConsolidation($request);
            }
        } catch (\Exception $e) {
            Log::error('BNS Get Consolidated Data Error: ' . $e->getMessage());
            return $this->getDefaultConsolidation($request);
        }
    }

    private function createReport($type, $data)
    {
        $id = uniqid('rpt_');
        $label = $this->getDemographicLabel($type);

        return [
            'id' => $id,
            'title' => $label . ' Report' . (isset($data['period']['label']) ? ' - ' . $data['period']['label'] : ''),
            'period' => $data['period'] ?? null,
            'demographic' => $type,
            'generated_at' => now()->toISOString(),
            'status' => 'generated',
            'data' => $data,
            'file_url' => null,
        ];
    }

    private function getDemographicLabel($type)
    {
        $labels = [
            'household' => 'Household',
            'family' => 'Family',
            'gender' => 'Gender',
            'age' => 'Age Group',
            'pregnant' => 'Pregnant',
            'breastfeeding' => 'Breastfeeding',
            'child-nutrition' => 'Child Nutrition (0-23 months)',
        ];
        return $labels[$type] ?? ucfirst($type);
    }
}
