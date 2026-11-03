<?php
// app/Http/Controllers/Mobile/Census/HouseholdController.php

namespace App\Http\Controllers\Mobile\Census;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Models\HouseholdAddress;
use App\Models\HouseholdCensusRecord;
use App\Models\HouseholdEnvironment;
use App\Models\FoodProductionType;
use App\Models\RecordActivityLog;
use App\Models\Resident;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class HouseholdController extends Controller
{
    use SendsNotifications;

    // ============================================================
    // CENSUS SUBMISSION (was HouseholdCensusController)
    // ============================================================

    public function storeCensus(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'zone' => 'required|exists:barangay_zones,id',
            'street' => 'required|string|max:255',
            'household_number' => 'required|string|unique:households,household_number',
            'household_tracking_number' => 'required|string|unique:households,household_tracking_number',
            'census_year' => 'required|integer',
            'census_date' => 'required|date',
            'monthly_income' => 'nullable|numeric|min:0',
            'toilet_type' => 'nullable|string|max:255',
            'water_source' => 'nullable|string|max:255',
            'garbage_disposal' => 'nullable|string|max:255',
            'tenure_status' => 'nullable|string|max:255',
            'couple_practices_family_planning' => 'nullable|boolean',
            'uses_iodized_salt' => 'nullable|string|max:255',
            'OSY_count' => 'nullable|integer|min:0',
            'ISY_count' => 'nullable|integer|min:0',
            'type_of_dwelling_unit' => 'nullable|string|max:255',
            'food_production_type_ids' => 'nullable|array',
            'food_production_type_ids.*' => 'exists:food_production_types,id',
            'residents' => 'required|array',
            'residents.*.id' => 'required|exists:residents,id',
            'residents.*.relationship_to_household' => 'required|string',
            'residents.*.is_primary' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        try {
            $result = DB::transaction(function () use ($request) {
                $address = HouseholdAddress::create([
                    'zone' => $request->zone,
                    'street' => $request->street,
                ]);

                $household = Household::create([
                    'address_id' => $address->id,
                    'household_number' => $request->household_number,
                    'household_tracking_number' => $request->household_tracking_number,
                    'status' => 'active',
                ]);

                $census = HouseholdCensusRecord::create([
                    'household_id' => $household->id,
                    'census_year' => $request->census_year,
                    'census_date' => $request->census_date,
                    'monthly_income' => $request->monthly_income,
                    'encoded_by' => Auth::id(),
                    'data_status' => 'Saved',
                ]);

                HouseholdEnvironment::create([
                    'household_census_id' => $census->id,
                    'toilet_type' => $request->toilet_type ?? 'None',
                    'water_source' => $request->water_source ?? 'Unknown',
                    'garbage_disposal' => $request->garbage_disposal ?? 'None',
                    'tenure_status' => $request->tenure_status ?? 'Owned',
                    'couple_practices_family_planning' => $request->couple_practices_family_planning ?? false,
                    'uses_iodized_salt' => $request->uses_iodized_salt ?? 'Unknown',
                    'OSY_count' => $request->OSY_count ?? 0,
                    'ISY_count' => $request->ISY_count ?? 0,
                    'type_of_dwelling_unit' => $request->type_of_dwelling_unit ?? 'Unknown',
                ]);

                if ($request->has('food_production_type_ids')) {
                    $census->foodProductionTypes()->sync($request->food_production_type_ids);
                }

                if ($request->has('residents')) {
                    foreach ($request->residents as $resident) {
                        DB::table('resident_households')->insert([
                            'resident_id' => $resident['id'],
                            'household_id' => $household->id,
                            'relationship_to_household' => $resident['relationship_to_household'],
                            'is_primary' => $resident['is_primary'],
                            'start_date' => now(),
                            'status' => 'active',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }

                $familyName = 'Unknown';
                if ($request->has('residents')) {
                    $residents = collect($request->residents);
                    $head = $residents->firstWhere('is_primary', true);
                    if ($head) {
                        $resident = Resident::find($head['id']);
                        $familyName = $resident ? $resident->last_name : 'Unknown';
                    }
                }

                RecordActivityLog::create([
                    'encoded_by' => Auth::id(),
                    'record_id' => $household->id,
                    'record_type' => get_class($household),
                    'action' => 'Added Household',
                    'data_status' => 'Saved',
                    'details' => "Successfully conducted census for {$familyName} Family"
                ]);

                $zoneId = (int) $request->zone;
                $this->notifyZoneLeadersInZone(
                    $zoneId,
                    '📋 New Household Census Submitted',
                    "A new census was submitted for {$familyName} Family (HH #{$household->household_number}).",
                    'census',
                    'high',
                    '/zone/census/records/' . $census->id,
                    Auth::id(),
                    'household_census',
                    $census->id
                );

                return [
                    'household_id' => $household->id,
                    'census_id' => $census->id,
                    'message' => 'Census record created successfully'
                ];
            });

            return $this->respondSuccess($result, 'Census record created successfully', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Census store error: ' . $e->getMessage());
            return $this->respondError('Failed to save record: ' . $e->getMessage(), null, 500);
        }
    }

    public function indexCensus(Request $request)
    {
        try {
            $query = HouseholdCensusRecord::with([
                'household.address',
                'household.address.barangayZone',
                'householdEnvironment',
                'foodProductionTypes',
                'encoder'
            ]);

            if ($request->has('year')) {
                $query->where('census_year', $request->year);
            }

            if ($request->has('household_id')) {
                $query->where('household_id', $request->household_id);
            }

            $records = $query->latest()->paginate(20);

            return $this->respondSuccess($records);
        } catch (\Exception $e) {
            Log::error('Census index error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch census records', null, 500);
        }
    }

    public function showCensus($id)
    {
        try {
            $record = HouseholdCensusRecord::with([
                'household.address',
                'household.address.barangayZone',
                'household.residents',
                'householdEnvironment',
                'foodProductionTypes'
            ])->find($id);

            if (!$record) {
                return $this->respondNotFound('Census record not found');
            }

            return $this->respondSuccess($record);
        } catch (\Exception $e) {
            Log::error('Census show error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch census record', null, 500);
        }
    }

    public function getFoodProductionTypes()
    {
        try {
            $types = FoodProductionType::all();
            return $this->respondSuccess($types);
        } catch (\Exception $e) {
            return $this->respondError('Failed to fetch food production types', null, 500);
        }
    }

    public function getStats()
    {
        try {
            $stats = [
                'totalResidents' => Resident::count(),
                'totalHouseholds' => Household::count(),
                'pendingCensus' => HouseholdCensusRecord::where('data_status', 'Pending')->count(),
                'geotagged' => \App\Models\HouseGeotag::distinct('household_id')->count(),
            ];

            return $this->respondSuccess($stats);
        } catch (\Exception $e) {
            return $this->respondError('Failed to fetch census stats', null, 500);
        }
    }

    public function submitSurvey(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'household_id' => 'required|exists:households,id',
                'answers' => 'required|array',
                'completed_at' => 'required|date',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            return $this->respondSuccess(null, 'Survey submitted successfully');
        } catch (\Exception $e) {
            return $this->respondError('Failed to submit survey', null, 500);
        }
    }

    // ============================================================
    // HOUSEHOLD INFO / CRUD (was HouseholdInfoController)
    // ============================================================

    public function search(Request $request)
    {
        try {
            $query = Household::with([
                'address',
                'address.barangayZone',
                'residents',
                'geotag',
                'censusRecords',
            ]);

            if ($request->filled('number')) {
                $number = trim($request->number);
                $query->where(function ($q) use ($number) {
                    $q->where('household_number', 'LIKE', "%{$number}%")
                        ->orWhere('household_tracking_number', 'LIKE', "%{$number}%");
                });
            }

            if ($request->filled('tracking')) {
                $tracking = trim($request->tracking);
                $query->where('household_tracking_number', 'LIKE', "%{$tracking}%");
            }

            $results = $query->limit(20)->get();

            return $this->respondSuccess($results);
        } catch (\Exception $e) {
            Log::error('Household search error: ' . $e->getMessage());
            return $this->respondError('Failed to search households', null, 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $query = Household::with([
                'address',
                'address.barangayZone',
                'residents',
                'censusRecords',
                'censusRecords.householdEnvironment',
                'geotag',
            ]);

            // Zone Leader scoping
            $user = Auth::user();
            $isZoneLeader = $user && $user->roles()
                ->where('name', 'Zone Leader')
                ->exists();

            if ($isZoneLeader) {
                $zoneId = DB::table('resident_households')
                    ->join('households', 'resident_households.household_id', '=', 'households.id')
                    ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
                    ->where('resident_households.resident_id', $user->resident_id)
                    ->where('resident_households.status', 'active')
                    ->value('household_addresses.zone');

                if ($zoneId) {
                    $query->whereHas('address', function ($q) use ($zoneId) {
                        $q->where('zone', $zoneId);
                    });
                }
            }

            $households = $query->get();

            return $this->respondSuccess($households);
        } catch (\Exception $e) {
            Log::error('Household index error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch households', null, 500);
        }
    }

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
                return $this->respondNotFound('Household not found');
            }

            return $this->respondSuccess($household);
        } catch (\Exception $e) {
            Log::error('Household show error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch household', null, 500);
        }
    }

    public function destroy($id)
    {
        try {
            $household = Household::find($id);

            if (!$household) {
                return $this->respondNotFound('Household not found');
            }

            if ($household->residents()->count() > 0) {
                return $this->respondError('Cannot delete household with existing residents', null, 422);
            }

            $householdNumber = $household->household_number;
            $household->delete();

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $id,
                'record_type' => Household::class,
                'action' => 'Deleted Household',
                'data_status' => 'Deleted',
                'details' => "Deleted household: {$householdNumber}",
            ]);

            return $this->respondSuccess(null, 'Household deleted successfully');
        } catch (\Exception $e) {
            Log::error('Household delete error: ' . $e->getMessage());
            return $this->respondError('Failed to delete household: ' . $e->getMessage(), null, 500);
        }
    }

    public function addResident(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'resident_id' => 'required|exists:residents,id',
                'household_id' => 'required|exists:households,id',
                'relationship_to_household' => 'required|string|max:255',
                'is_primary' => 'required|boolean',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            DB::beginTransaction();

            $existing = DB::table('resident_households')
                ->where('resident_id', $request->resident_id)
                ->where('status', 'active')
                ->first();

            if ($existing) {
                DB::table('resident_households')
                    ->where('resident_id', $request->resident_id)
                    ->where('status', 'active')
                    ->update([
                        'status' => 'moveout',
                        'end_date' => now(),
                        'updated_at' => now(),
                    ]);
            }

            if ($request->is_primary) {
                DB::table('resident_households')
                    ->where('household_id', $request->household_id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }

            DB::table('resident_households')->insert([
                'resident_id' => $request->resident_id,
                'household_id' => $request->household_id,
                'relationship_to_household' => $request->relationship_to_household,
                'is_primary' => $request->is_primary,
                'start_date' => now(),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $resident = Resident::find($request->resident_id);
            $household = Household::find($request->household_id);

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $request->resident_id,
                'record_type' => Resident::class,
                'action' => 'Added to Household',
                'data_status' => 'Active',
                'details' => "Added resident {$resident->first_name} {$resident->last_name} to household {$household->household_number}",
            ]);

            DB::commit();

            return $this->respondSuccess([
                'resident_id' => $request->resident_id,
                'household_id' => $request->household_id,
                'relationship_to_household' => $request->relationship_to_household,
                'is_primary' => $request->is_primary,
                'message' => 'Resident added to household successfully',
            ], 'Resident added to household successfully', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Add resident to household error: ' . $e->getMessage());
            return $this->respondError('Failed to add resident to household: ' . $e->getMessage(), null, 500);
        }
    }

    public function removeResident(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'resident_id' => 'required|exists:residents,id',
                'household_id' => 'required|exists:households,id',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            DB::beginTransaction();

            $updated = DB::table('resident_households')
                ->where('resident_id', $request->resident_id)
                ->where('household_id', $request->household_id)
                ->where('status', 'active')
                ->update([
                    'status' => 'moveout',
                    'end_date' => now(),
                    'updated_at' => now(),
                ]);

            if (!$updated) {
                return $this->respondError('Resident not found in this household', null, 404);
            }

            $resident = Resident::find($request->resident_id);
            $household = Household::find($request->household_id);

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $request->resident_id,
                'record_type' => Resident::class,
                'action' => 'Removed from Household',
                'data_status' => 'Moveout',
                'details' => "Removed resident {$resident->first_name} {$resident->last_name} from household {$household->household_number}",
            ]);

            DB::commit();

            return $this->respondSuccess(null, 'Resident removed from household successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Remove resident error: ' . $e->getMessage());
            return $this->respondError('Failed to remove resident: ' . $e->getMessage(), null, 500);
        }
    }

    public function getByEncoder($userId)
    {
        try {
            $householdIds = RecordActivityLog::where('encoded_by', $userId)
                ->where('record_type', Household::class)
                ->where('action', 'Created Household')
                ->pluck('record_id');

            $households = Household::with([
                'address',
                'address.barangayZone',
                'residents',
                'censusRecords',
                'censusRecords.householdEnvironment',
                'geotag',
            ])->whereIn('id', $householdIds)->get();

            return $this->respondSuccess($households);
        } catch (\Exception $e) {
            return $this->respondError('Failed to fetch households', null, 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'zone' => 'required|exists:barangay_zones,id',
                'street' => 'required|string|max:255',
                'household_number' => 'required|string|unique:households,household_number',
                'household_tracking_number' => 'required|string|unique:households,household_tracking_number',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            DB::beginTransaction();

            $address = HouseholdAddress::create([
                'zone' => $request->zone,
                'street' => $request->street,
            ]);

            $household = Household::create([
                'address_id' => $address->id,
                'household_number' => $request->household_number,
                'household_tracking_number' => $request->household_tracking_number,
                'status' => 'active',
            ]);

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $household->id,
                'record_type' => Household::class,
                'action' => 'Created Household',
                'data_status' => 'Pending',
                'details' => "Created new household: {$household->household_number}",
            ]);

            DB::commit();

            return $this->respondSuccess($household->load('address'), 'Household created successfully', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Household store error: ' . $e->getMessage());
            return $this->respondError('Failed to create household: ' . $e->getMessage(), null, 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $household = Household::find($id);

            if (!$household) {
                return $this->respondNotFound('Household not found');
            }

            $validator = Validator::make($request->all(), [
                'zone' => 'sometimes|exists:barangay_zones,id',
                'street' => 'sometimes|string|max:255',
                'household_number' => 'sometimes|string|unique:households,household_number,' . $id,
                'household_tracking_number' => 'sometimes|string|unique:households,household_tracking_number,' . $id,
                'status' => 'sometimes|in:active,inactive,pending',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            DB::beginTransaction();

            if ($request->has('zone') || $request->has('street')) {
                $household->address->update($request->only(['zone', 'street']));
            }

            $household->update($request->only([
                'household_number',
                'household_tracking_number',
                'status',
            ]));

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $household->id,
                'record_type' => Household::class,
                'action' => 'Updated Household',
                'data_status' => $household->status,
                'details' => "Updated household: {$household->household_number}",
            ]);

            DB::commit();

            return $this->respondSuccess($household->load('address'), 'Household updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Household update error: ' . $e->getMessage());
            return $this->respondError('Failed to update household: ' . $e->getMessage(), null, 500);
        }
    }
}