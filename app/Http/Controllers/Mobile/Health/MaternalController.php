<?php
// app/Http/Controllers/Mobile/Health/MaternalController.php

namespace App\Http\Controllers\Mobile\Health;

use App\Http\Controllers\Controller;
use App\Models\MaternalProfile;
use App\Traits\ResolvesZones;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class MaternalController extends Controller
{
    use SendsNotifications, ResolvesZones;

    public function index(Request $request)
    {
        $query = MaternalProfile::with('resident');

        if ($request->has('pregnancy_status')) {
            $query->where('pregnancy_status', $request->pregnancy_status);
        }

        $profiles = $query->latest()->paginate(15);
        return $this->respondSuccess($profiles);
    }

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
}