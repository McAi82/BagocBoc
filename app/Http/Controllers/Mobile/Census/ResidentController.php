<?php
// app/Http/Controllers/Mobile/Census/ResidentController.php

namespace App\Http\Controllers\Mobile\Census;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\RecordActivityLog;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ResidentController extends Controller
{
    use SendsNotifications;

    public function index(Request $request)
    {
        $query = Resident::with('households');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                    ->orWhere('phone_number', 'LIKE', "%{$search}%")
                    ->orWhere('email', 'LIKE', "%{$search}%");  // ✅ ADD
            });
        }

        $residents = $query->latest()->paginate(50);
        return $this->respondSuccess($residents);
    }

    public function getByEncoder($userId)
    {
        $residentIds = RecordActivityLog::where('encoded_by', $userId)
            ->where('record_type', Resident::class)
            ->whereIn('action', ['Created Residents', 'created'])
            ->pluck('record_id');

        $residents = Resident::with('households')
            ->whereIn('id', $residentIds)->latest()->get();

        return $this->respondSuccess($residents);
    }

    /**
     * Store new resident
     * ✅ Now includes email validation (unique)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'suffix' => 'nullable|string|max:10',
            'phone_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:residents,email',  // ✅ ADD
            'gender' => 'required|in:Male,Female',
            'citizenship' => 'nullable|string|max:255',
            'voter_status' => 'nullable|in:Registered Local,Registered_Outside,Not Registered',
            'civil_status' => 'nullable|in:Single,Married,Widow,Legally Separated',
            'birth_date' => 'required|date',
            'place_of_birth' => 'nullable|string|max:255',
            'occupation' => 'nullable|string|max:255',
            'monthly_income' => 'nullable|numeric|between:0,9999999999.99',
            'education_attainment' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $data = $validator->validated();
        $data['citizenship'] = $data['citizenship'] ?? 'Filipino';
        $data['voter_status'] = $data['voter_status'] ?? 'Not Registered';
        $data['civil_status'] = $data['civil_status'] ?? 'Single';
        $data['education_attainment'] = $data['education_attainment'] ?? 'N/A';
        $data['place_of_birth'] = $data['place_of_birth'] ?? 'Opol, Misamis Oriental';

        $resident = Resident::create($data);

        RecordActivityLog::create([
            'encoded_by' => Auth::id(),
            'record_id' => $resident->id,
            'record_type' => get_class($resident),
            'action' => 'Created Residents',
            'data_status' => 'Saved',
            'details' => "Registered a new resident: {$resident->first_name} {$resident->last_name}"
        ]);

        // ✅ ZONE-SCOPED NOTIFICATION
        try {
            $zoneId = DB::table('resident_households')
                ->join('households', 'resident_households.household_id', '=', 'households.id')
                ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
                ->where('resident_households.resident_id', $resident->id)
                ->where('resident_households.status', 'active')
                ->value('household_addresses.zone');

            if ($zoneId) {
                $this->notifyZoneLeadersInZone(
                    (int) $zoneId,
                    '👤 New Resident Registered',
                    "A new resident {$resident->first_name} {$resident->last_name} has been registered in your zone.",
                    'registration',
                    'normal',
                    '/zone/registrations',
                    Auth::id(),
                    'resident',
                    $resident->id
                );
            } else {
                Log::info('Resident created without household — falling back to barangay-wide Zone Leader notify', [
                    'resident_id' => $resident->id,
                ]);

                $this->notifyRole(
                    'Zone Leader',
                    '👤 New Resident Registered',
                    "A new resident {$resident->first_name} {$resident->last_name} has been registered (not yet assigned to a household).",
                    'registration',
                    'normal',
                    '/zone/registrations',
                    Auth::id(),
                    'resident',
                    $resident->id
                );
            }
        } catch (\Exception $e) {
            Log::error('Resident notify zone leaders error: ' . $e->getMessage());
        }

        return $this->respondSuccess($resident, 'Resident created successfully', 201);
    }

    public function update(Request $request, $id)
    {
        $resident = Resident::find($id);

        if (!$resident) {
            return $this->respondNotFound('Resident not found');
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'suffix' => 'nullable|string|max:10',
            'phone_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255|unique:residents,email,' . $id,  // ✅ ADD
            'gender' => 'sometimes|in:Male,Female',
            'citizenship' => 'sometimes|string|max:255',
            'voter_status' => 'sometimes|in:Registered Local,Registered_Outside,Not Registered',
            'civil_status' => 'sometimes|in:Single,Married,Widow,Legally Separated',
            'birth_date' => 'sometimes|date',
            'place_of_birth' => 'sometimes|string|max:255',
            'occupation' => 'nullable|string|max:255',
            'monthly_income' => 'nullable|numeric|between:0,9999999999.99',
            'education_attainment' => 'sometimes|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $resident->update($validator->validated());

        RecordActivityLog::create([
            'encoded_by' => Auth::id(),
            'record_id' => $resident->id,
            'record_type' => get_class($resident),
            'action' => 'updated',
            'data_status' => 'Updated',
            'details' => "Updated resident: {$resident->first_name} {$resident->last_name}"
        ]);

        return $this->respondSuccess($resident, 'Resident updated successfully');
    }

    public function destroy($id)
    {
        $resident = Resident::find($id);

        if (!$resident) {
            return $this->respondNotFound('Resident not found');
        }

        $name = $resident->first_name . ' ' . $resident->last_name;
        $resident->delete();

        RecordActivityLog::create([
            'encoded_by' => Auth::id(),
            'record_id' => $id,
            'record_type' => get_class($resident),
            'action' => 'deleted',
            'data_status' => 'Deleted',
            'details' => "Deleted resident: {$name}"
        ]);

        return $this->respondSuccess(null, 'Resident deleted successfully');
    }

    public function show($id)
    {
        try {
            $resident = Resident::with([
                'households',
                'households.address',
                'households.address.barangayZone'
            ])->find($id);

            if (!$resident) {
                return $this->respondNotFound('Resident not found');
            }

            $household = $resident->households->first();

            return $this->respondSuccess([
                'id' => $resident->id,
                'first_name' => $resident->first_name,
                'middle_name' => $resident->middle_name,
                'last_name' => $resident->last_name,
                'suffix' => $resident->suffix,
                'full_name' => $resident->full_name,
                'phone_number' => $resident->phone_number,
                'gender' => $resident->gender,
                'birth_date' => $resident->birth_date,
                'age' => $resident->age,
                'civil_status' => $resident->civil_status,
                'citizenship' => $resident->citizenship,
                'occupation' => $resident->occupation,
                'monthly_income' => $resident->monthly_income,
                'education_attainment' => $resident->education_attainment,
                'voter_status' => $resident->voter_status,
                'place_of_birth' => $resident->place_of_birth,
                'household_number' => $household ? $household->household_number : null,
                'zone_name' => $household && $household->address && $household->address->barangayZone
                    ? $household->address->barangayZone->name
                    : null,
                'address' => $household && $household->address ? $household->address->street : null,
                'status' => $resident->status ?? 'active',
            ]);
        } catch (\Exception $e) {
            Log::error('Resident show error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch resident', null, 500);
        }
    }
}
