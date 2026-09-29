<?php

namespace App\Http\Controllers\Mobile\Health;

use App\Http\Controllers\Controller;
use App\Models\MaternalProfile;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MaternalController extends Controller
{
    use SendsNotifications;

    public function index(Request $request)
    {
        $query = MaternalProfile::with('resident');

        if ($request->has('pregnancy_status')) {
            $query->where('pregnancy_status', $request->pregnancy_status);
        }

        $profiles = $query->latest()->paginate(15);
        return $this->respondSuccess($profiles);
    }

    /**
     * Create maternal profile
     * ✅ Zone-scoped notification to BHWs
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resident_id' => 'required|exists:residents,id',
            'pregnancy_status' => 'required|in:pregnant,postpartum,terminated',
            'expected_delivery_date' => 'nullable|date',
            'last_checkup_date' => 'nullable|date',
            'family_planning' => 'nullable|boolean',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $profile = MaternalProfile::create($request->all());
        $profile->load('resident');

        $residentName = $profile->resident ? $profile->resident->full_name : 'Unknown';

        // ✅ ZONE-SCOPED NOTIFICATION
        try {
            $zoneId = $this->resolveZoneForResident((int) $profile->resident_id);

            if ($zoneId) {
                $this->notifyBHWsInZone(
                    $zoneId,
                    '🤰 New Maternal Profile',
                    "A new maternal profile was created for {$residentName} ({$request->pregnancy_status}).",
                    'health',
                    'high',
                    null,
                    Auth::id(),
                    'maternal_profile',
                    $profile->id
                );
            } else {
                Log::info('Maternal profile — no zone found, skipping BHW notification', [
                    'profile_id' => $profile->id,
                    'resident_id' => $profile->resident_id,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Maternal notify BHWs error: ' . $e->getMessage());
        }

        return $this->respondSuccess($profile, 'Maternal profile created successfully', 201);
    }

    public function update(Request $request, $id)
    {
        $profile = MaternalProfile::find($id);

        if (!$profile) {
            return $this->respondNotFound('Maternal profile not found');
        }

        $validator = Validator::make($request->all(), [
            'pregnancy_status' => 'sometimes|in:pregnant,postpartum,terminated',
            'expected_delivery_date' => 'nullable|date',
            'last_checkup_date' => 'nullable|date',
            'family_planning' => 'nullable|boolean',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $profile->update($request->all());
        $profile->load('resident');

        return $this->respondSuccess($profile, 'Maternal profile updated successfully');
    }

    public function show($id)
    {
        $profile = MaternalProfile::with('resident')->find($id);

        if (!$profile) {
            return $this->respondNotFound('Maternal profile not found');
        }

        return $this->respondSuccess($profile);
    }

    public function destroy($id)
    {
        $profile = MaternalProfile::find($id);

        if (!$profile) {
            return $this->respondNotFound('Maternal profile not found');
        }

        $profile->delete();
        return $this->respondSuccess(null, 'Maternal profile deleted successfully');
    }

    /**
     * Resolve the zone ID for a resident via their active household
     */
    private function resolveZoneForResident(int $residentId): ?int
    {
        $zoneId = DB::table('resident_households')
            ->join('households', 'resident_households.household_id', '=', 'households.id')
            ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
            ->where('resident_households.resident_id', $residentId)
            ->where('resident_households.status', 'active')
            ->value('household_addresses.zone');

        return $zoneId ? (int) $zoneId : null;
    }
}
