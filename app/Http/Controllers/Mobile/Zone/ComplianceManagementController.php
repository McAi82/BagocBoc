<?php
// app/Http/Controllers/Mobile/Zone/ComplianceManagementController.php

namespace App\Http\Controllers\Mobile\Zone;

use App\Http\Controllers\Controller;
use App\Models\BarangayZone;
use App\Models\ComplianceRequirement;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ComplianceManagementController extends Controller
{
    use SendsNotifications;

    public function index(Request $request)
    {
        try {
            $query = ComplianceRequirement::query();

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $compliance = $query->latest()->get();
            return $this->respondSuccess($compliance);
        } catch (\Exception $e) {
            Log::error('Compliance fetch error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch compliance requirements', null, 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'zone' => 'required|string|max:255',
                'requirement' => 'required|string|max:255',
                'penalty' => 'nullable|numeric|min:0',
                'status' => 'in:active,inactive',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $compliance = ComplianceRequirement::create($request->all());

            try {
                $zoneId = $this->resolveZoneId($request->zone);

                if ($zoneId) {
                    $userIds = $this->getUserIdsForRoleInZone('Resident', $zoneId);

                    if (!empty($userIds)) {
                        $this->notify(
                            $userIds,
                            '📋 New Compliance Requirement',
                            "A new compliance requirement '{$compliance->name}' has been added for your zone. Penalty: ₱" . number_format((float) ($request->penalty ?? 0), 2),
                            'compliance',
                            'normal',
                            '/resident/compliance',
                            Auth::id(),
                            'compliance_requirement',
                            $compliance->id
                        );
                    } else {
                        Log::info('Compliance requirement — no residents in zone, skipping notification', [
                            'compliance_id' => $compliance->id,
                            'zone_id' => $zoneId,
                        ]);
                    }
                } else {
                    Log::info('Compliance requirement — zone not resolvable, notifying all residents', [
                        'compliance_id' => $compliance->id,
                        'zone_input' => $request->zone,
                    ]);

                    $this->notifyRole(
                        'Resident',
                        '📋 New Compliance Requirement',
                        "A new compliance requirement '{$compliance->name}' has been added for {$request->zone}. Penalty: ₱" . number_format((float) ($request->penalty ?? 0), 2),
                        'compliance',
                        'normal',
                        '/resident/compliance',
                        Auth::id(),
                        'compliance_requirement',
                        $compliance->id
                    );
                }
            } catch (\Exception $e) {
                Log::error('Compliance notify residents error: ' . $e->getMessage());
            }

            return $this->respondSuccess($compliance, 'Compliance requirement created successfully', 201);
        } catch (\Exception $e) {
            Log::error('Compliance creation error: ' . $e->getMessage());
            return $this->respondError('Failed to create compliance requirement', null, 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $compliance = ComplianceRequirement::find($id);

            if (!$compliance) {
                return $this->respondNotFound('Compliance requirement not found');
            }

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|string|max:255',
                'description' => 'nullable|string',
                'zone' => 'sometimes|string|max:255',
                'requirement' => 'sometimes|string|max:255',
                'penalty' => 'nullable|numeric|min:0',
                'status' => 'in:active,inactive',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $compliance->update($request->all());

            return $this->respondSuccess($compliance, 'Compliance requirement updated successfully');
        } catch (\Exception $e) {
            Log::error('Compliance update error: ' . $e->getMessage());
            return $this->respondError('Failed to update compliance requirement', null, 500);
        }
    }

    public function destroy($id)
    {
        try {
            $compliance = ComplianceRequirement::find($id);

            if (!$compliance) {
                return $this->respondNotFound('Compliance requirement not found');
            }

            $compliance->delete();
            return $this->respondSuccess(null, 'Compliance requirement deleted successfully');
        } catch (\Exception $e) {
            Log::error('Compliance deletion error: ' . $e->getMessage());
            return $this->respondError('Failed to delete compliance requirement', null, 500);
        }
    }

    private function resolveZoneId($zoneInput): ?int
    {
        if ($zoneInput === null || $zoneInput === '') return null;

        if (is_numeric($zoneInput)) {
            $exists = BarangayZone::where('id', (int) $zoneInput)->exists();
            return $exists ? (int) $zoneInput : null;
        }

        $zone = BarangayZone::where('name', $zoneInput)->first();
        if ($zone) return (int) $zone->id;

        if (preg_match('/zone\s*(\d+)/i', $zoneInput, $m)) {
            $zoneByNumber = BarangayZone::where('zone_number', (int) $m[1])->first();
            if ($zoneByNumber) return (int) $zoneByNumber->id;
        }

        return null;
    }
}