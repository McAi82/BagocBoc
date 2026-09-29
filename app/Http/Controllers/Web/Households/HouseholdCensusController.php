<?php

namespace App\Http\Controllers\Web\Households;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Models\HouseholdAddress;
use App\Models\HouseholdCensusRecord;
use App\Models\HouseholdEnvironment;
use App\Models\RecordActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class HouseholdCensusController extends Controller
{
    /**
     * Add full household census record
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            // Address fields
            'zone' => 'required|exists:barangay_zones,id',
            'street' => 'required|string|max:255',
            'subdivision' => 'nullable|string|max:255',

            // Household fields
            'household_number' => 'required|string|unique:households,household_number',
            'household_tracking_number' => 'required|string|unique:households,household_tracking_number',

            // Census Record fields
            'census_year' => 'required|integer',
            'census_date' => 'required|date',
            'monthly_income' => 'nullable|numeric|min:0',

            // Environment fields
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
                    'subdivision' => $request->subdivision,
                ]);

                $household = Household::create([
                    'address_id' => $address->id,
                    'household_number' => $request->household_number,
                    'household_tracking_number' => $request->household_tracking_number,
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

                RecordActivityLog::create([
                    'encoded_by' => Auth::id(),
                    'record_id' => $household->id,
                    'record_type' => get_class($household),
                    'action' => 'Added Household',
                    'data_status' => 'Saved',
                    'details' => "Successfully conducted census for Household #{$household->household_number}"
                ]);

                return ['household_id' => $household->id, 'census_id' => $census->id];
            });

            return $this->respondSuccess($result, 'Census record created successfully', 201);
        } catch (\Exception $e) {
            return $this->respondError('Failed to save record: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Get all census records
     */
    public function index(Request $request)
    {
        $query = HouseholdCensusRecord::with([
            'household.address',
            'householdEnvironment',
            'foodProductionTypes'
        ]);

        if ($request->has('year')) {
            $query->where('census_year', $request->year);
        }

        $records = $query->latest()->get();

        return $this->respondSuccess($records);
    }

    /**
     * Show census record
     */
    public function show($id)
    {
        $record = HouseholdCensusRecord::with([
            'household.address',
            'household.residents',
            'householdEnvironment',
            'foodProductionTypes'
        ])->find($id);

        if (!$record) {
            return $this->respondNotFound('Census record not found');
        }

        return $this->respondSuccess($record);
    }
}