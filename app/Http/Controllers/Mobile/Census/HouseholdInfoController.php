<?php

namespace App\Http\Controllers\Mobile\Census;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Models\RecordActivityLog;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class HouseholdInfoController extends Controller
{
    use SendsNotifications;

    /**
     * ✅ FIXED: Search households
     */
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

    public function index()
    {
        try {
            $households = Household::with([
                'address',
                'address.barangayZone',
                'residents',
                'censusRecords',
                'censusRecords.householdEnvironment',
                'geotag',
            ])->get();

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

    /**
     * Add resident to existing household
     * ✅ Notifies Zone Leader when a resident is added
     */
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

            $resident = \App\Models\Resident::find($request->resident_id);
            $household = Household::find($request->household_id);

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $request->resident_id,
                'record_type' => \App\Models\Resident::class,
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

            $resident = \App\Models\Resident::find($request->resident_id);
            $household = Household::find($request->household_id);

            RecordActivityLog::create([
                'encoded_by' => Auth::id(),
                'record_id' => $request->resident_id,
                'record_type' => \App\Models\Resident::class,
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

            $address = \App\Models\HouseholdAddress::create([
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
