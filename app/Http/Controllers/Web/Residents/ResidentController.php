<?php

namespace App\Http\Controllers\Web\Residents;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\RecordActivityLog;
use App\Models\Certification;
use App\Models\Penalty;
use App\Models\NotificationRecipient;
use App\Models\Clearance;
use App\Models\User;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ResidentController extends Controller
{
    use SendsNotifications;

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
            'citizenship' => 'required|string|max:255',
            'voter_status' => 'required|in:Registered Local,Registered_Outside,Not Registered',
            'civil_status' => 'required|in:Single,Married,Widow,Legally Separated',
            'birth_date' => 'required|date',
            'place_of_birth' => 'required|string|max:255',
            'occupation' => 'nullable|string|max:255',
            'monthly_income' => 'nullable|numeric|between:0,9999999999.99',
            'education_attainment' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $resident = Resident::create($validator->validated());

        RecordActivityLog::create([
            'encoded_by' => Auth::id(),
            'record_id' => $resident->id,
            'record_type' => get_class($resident),
            'action' => 'Created Residents',
            'data_status' => 'Saved',
            'details' => "Registered a new resident: {$resident->first_name} {$resident->last_name}"
        ]);

        return $this->respondSuccess($resident, 'Resident created successfully', 201);
    }

    public function show($id)
    {
        $resident = Resident::with('households')->find($id);

        if (!$resident) {
            return $this->respondNotFound('Resident not found');
        }

        return $this->respondSuccess($resident);
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

        // ✅ Notify resident if they have an account
        $user = User::where('resident_id', $resident->id)->first();
        if ($user) {
            $this->notifyUser(
                $user->id,
                '📝 Profile Updated',
                "Your resident profile has been updated by barangay staff.",
                'profile',
                'normal',
                '/resident/profile',
                Auth::id(),
                'resident',
                $resident->id
            );
        }

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

    public function index(Request $request)
    {
        $query = Resident::with([
            'households',
            'households.address',
            'households.address.barangayZone'
        ]);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                    ->orWhere('phone_number', 'LIKE', "%{$search}%");
            });
        }

        $residents = $query->latest()->paginate(50);

        return $this->respondSuccess($residents);
    }

    public function getStats()
    {
        try {
            $userId = Auth::id();

            if (!$userId) {
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            $user = User::with('resident')->find($userId);

            if (!$user || !$user->resident) {
                return response()->json([
                    'success' => true,
                    'message' => 'Resident profile not found',
                    'data' => [
                        'pendingCertificates' => 0,
                        'totalPenalties' => 0,
                        'notifications' => 0,
                        'pendingClearances' => 0,
                        'totalCertificates' => 0,
                    ]
                ], 200);
            }

            $residentId = $user->resident->id;

            $pendingCertificates = Certification::where('resident_id', $residentId)
                ->whereIn('status', ['Pending', 'In Review'])->count();

            $totalPenalties = Penalty::where('resident_id', $residentId)
                ->where('status', 'pending')->sum('amount');

            $notifications = NotificationRecipient::where('user_id', $userId)
                ->where('is_read', false)->count();

            $pendingClearances = Clearance::where('resident_id', $residentId)
                ->where('status', 'pending')->count();

            $totalCertificates = Certification::where('resident_id', $residentId)->count();

            $stats = [
                'pendingCertificates' => (int) $pendingCertificates,
                'totalPenalties' => (float) $totalPenalties,
                'notifications' => (int) $notifications,
                'pendingClearances' => (int) $pendingClearances,
                'totalCertificates' => (int) $totalCertificates,
            ];

            return response()->json([
                'success' => true,
                'message' => 'Stats retrieved successfully',
                'data' => $stats
            ], 200);
        } catch (\Exception $e) {
            Log::error('Resident stats error: ' . $e->getMessage());

            return response()->json([
                'success' => true,
                'message' => 'Stats retrieved with defaults',
                'data' => [
                    'pendingCertificates' => 0,
                    'totalPenalties' => 0,
                    'notifications' => 0,
                    'pendingClearances' => 0,
                    'totalCertificates' => 0,
                ]
            ], 200);
        }
    }

    public function getByEncoder($userId)
    {
        $residentIds = RecordActivityLog::where('encoded_by', $userId)
            ->where('record_type', Resident::class)
            ->whereIn('action', ['Created Residents', 'created'])
            ->pluck('record_id');

        $residents = Resident::with('households')
            ->whereIn('id', $residentIds)
            ->latest()->get();

        return $this->respondSuccess($residents);
    }
}
