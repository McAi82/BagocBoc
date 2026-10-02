<?php
// app/Http/Controllers/Mobile/Zone/CertificateRequestController.php

namespace App\Http\Controllers\Mobile\Zone;

use App\Http\Controllers\Controller;
use App\Models\Certification;
use App\Traits\ResolvesZones;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CertificateRequestController extends Controller
{
    use SendsNotifications, ResolvesZones;

    // ============================================
    // LIST
    // ============================================

    public function index(Request $request)
    {
        try {
            $query = Certification::with([
                'certificationType',
                'requester',
                'requester.resident',
                'requester.resident.households',
                'requester.resident.households.address',
                'requester.resident.households.address.barangayZone',
            ]);

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Optional: filter by ZL clearance
            if ($request->filled('zl_status')) {
                if ($request->zl_status === 'unreviewed') {
                    $query->whereNull('zl_clearance_status');
                } else {
                    $query->where('zl_clearance_status', $request->zl_status);
                }
            }

            $zoneId = $this->getZoneLeaderZone(Auth::id());

            if ($zoneId) {
                $residentIds = $this->getResidentIdsByZone($zoneId);
                if ($residentIds->isNotEmpty()) {
                    $query->whereHas('requester', function ($q) use ($residentIds) {
                        $q->whereIn('resident_id', $residentIds);
                    });
                } else {
                    return $this->respondSuccess([], 'No certificate requests found');
                }
            }

            $requests = $query->latest()->get();

            $formattedRequests = $requests->map(function ($cert) {
                $resident = $cert->requester && $cert->requester->resident
                    ? $cert->requester->resident
                    : null;

                $household = null;
                $zoneName = null;
                if ($resident && $resident->households && $resident->households->first()) {
                    $household = $resident->households->first();
                    if ($household && $household->address && $household->address->barangayZone) {
                        $zoneName = $household->address->barangayZone->name;
                    }
                }

                return [
                    'id'                    => $cert->id,
                    'resident_id'           => $resident ? $resident->id : null,
                    'resident_name'         => $resident ? $resident->full_name : 'Unknown',
                    'certificate_type'      => $cert->certificationType ? $cert->certificationType->name : 'N/A',
                    'certification_type_id' => $cert->certification_type_id,
                    'purpose'               => $cert->purpose ?? 'N/A',
                    'status'                => strtolower($cert->status),
                    'requested_at'          => $cert->created_at ? $cert->created_at->toISOString() : now()->toISOString(),
                    'household_number'      => $household ? $household->household_number : null,
                    'zone'                  => $zoneName ?? 'N/A',
                    'fee'                   => $cert->certificationType ? (float) $cert->certificationType->fee : 0,

                    // ✅ ZL clearance fields
                    'zl_clearance_status'   => $cert->zl_clearance_status,
                    'zl_clearance_notes'    => $cert->zl_clearance_notes,
                    'zl_clearance_date'     => $cert->zl_clearance_date
                        ? $cert->zl_clearance_date->toISOString()
                        : null,
                ];
            });

            return $this->respondSuccess($formattedRequests);
        } catch (\Exception $e) {
            Log::error('Certificate requests error: ' . $e->getMessage());
            return $this->respondSuccess([], 'No certificate requests found');
        }
    }

    // ============================================
    // ZL FIRST-PASS ACTIONS
    // ============================================

    /**
     * Zone Leader clears a request → status becomes "In Review" and the
     * Secretary picks it up next.
     */
    public function approve(Request $request, $id)
    {
        try {
            $certification = Certification::find($id);

            if (!$certification) {
                return $this->respondNotFound('Certificate request not found');
            }

            if (!$certification->canZoneLeaderClear()) {
                return $this->respondError(
                    'This request has already been reviewed by a Zone Leader.',
                    null,
                    422
                );
            }

            $validator = Validator::make($request->all(), [
                'notes' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $certification->update([
                'status'               => 'In Review',
                'zl_clearance_status'  => 'cleared',
                'zl_clearance_notes'   => $request->notes,
                'zl_clearance_date'    => now(),
                'processed_by_user_id' => Auth::id(),
            ]);

            $this->syncToWebFrontDesk($certification);

            $this->notifyCertificateResident(
                $certification,
                '🔎 Certificate Request Under Review',
                "Your certificate request ({$certification->reference_number}) has been cleared by your Zone Leader and is now with the Barangay Secretary for approval.",
                'normal'
            );

            return $this->respondSuccess(
                $certification->fresh()->load(['certificationType', 'requester']),
                'Request cleared and forwarded to the Secretary'
            );
        } catch (\Exception $e) {
            Log::error('ZL clearance error: ' . $e->getMessage());
            return $this->respondError('Failed to clear certificate', null, 500);
        }
    }

    /**
     * Zone Leader flags a request with a reason. The status stays "Pending"
     * but the flag is visible to the Secretary.
     */
    public function flag(Request $request, $id)
    {
        try {
            $certification = Certification::find($id);

            if (!$certification) {
                return $this->respondNotFound('Certificate request not found');
            }

            if (!$certification->canZoneLeaderClear()) {
                return $this->respondError(
                    'This request has already been reviewed by a Zone Leader.',
                    null,
                    422
                );
            }

            $validator = Validator::make($request->all(), [
                'reason' => 'required|string|max:500',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $certification->update([
                'zl_clearance_status'  => 'flagged',
                'zl_clearance_notes'   => $request->reason,
                'zl_clearance_date'    => now(),
                'processed_by_user_id' => Auth::id(),
                // status intentionally stays 'Pending'
            ]);

            $this->notifyCertificateResident(
                $certification,
                '⚠️ Certificate Request Flagged',
                "Your certificate request ({$certification->reference_number}) was flagged by your Zone Leader: {$request->reason}",
                'high'
            );

            $this->notifyRoles(
                ['Barangay Secretary'],
                '⚠️ ZL Flagged a Certificate Request',
                "{$certification->resident_name}'s request ({$certification->reference_number}) was flagged: {$request->reason}",
                'certificate',
                'high',
                '/certifications/' . $certification->id,
                Auth::id()
            );

            return $this->respondSuccess(
                $certification->fresh()->load(['certificationType', 'requester']),
                'Request flagged'
            );
        } catch (\Exception $e) {
            Log::error('ZL flag error: ' . $e->getMessage());
            return $this->respondError('Failed to flag certificate', null, 500);
        }
    }

    /**
     * Retract a prior clearance/flag before the Secretary acts.
     */
    public function retract(Request $request, $id)
    {
        try {
            $certification = Certification::find($id);

            if (!$certification) {
                return $this->respondNotFound('Certificate request not found');
            }

            if (!$certification->isZlCleared() && !$certification->isZlFlagged()) {
                return $this->respondError('Nothing to retract.', null, 422);
            }

            if (in_array($certification->status, ['Approved', 'Ready for Release', 'Released'])) {
                return $this->respondError(
                    'The Secretary has already acted on this request.',
                    null,
                    422
                );
            }

            $certification->update([
                'status'               => 'Pending',
                'zl_clearance_status'  => null,
                'zl_clearance_notes'   => null,
                'zl_clearance_date'    => null,
            ]);

            return $this->respondSuccess(
                $certification->fresh()->load(['certificationType', 'requester']),
                'Clearance retracted'
            );
        } catch (\Exception $e) {
            Log::error('ZL retract error: ' . $e->getMessage());
            return $this->respondError('Failed to retract clearance', null, 500);
        }
    }

    // ============================================
    // LEGACY / OTHER LIST ENDPOINTS
    // ============================================

    public function allRequests()
    {
        try {
            $requests = Certification::with([
                'certificationType',
                'requester',
                'requester.resident',
            ])->latest()->get();

            $formattedRequests = $requests->map(function ($cert) {
                $resident = $cert->requester && $cert->requester->resident
                    ? $cert->requester->resident
                    : null;

                return [
                    'id'               => $cert->id,
                    'resident_id'      => $resident ? $resident->id : null,
                    'resident_name'    => $resident ? $resident->full_name : 'Unknown',
                    'certificate_type' => $cert->certificationType ? $cert->certificationType->name : 'N/A',
                    'purpose'          => $cert->purpose ?? 'N/A',
                    'status'           => strtolower($cert->status),
                    'requested_at'     => $cert->created_at ? $cert->created_at->toISOString() : now()->toISOString(),
                ];
            });

            return $this->respondSuccess($formattedRequests);
        } catch (\Exception $e) {
            return $this->respondSuccess([], 'No certificate requests found');
        }
    }

    public function getRequestCounts()
    {
        try {
            $zoneId = $this->getZoneLeaderZone(Auth::id());

            $query = Certification::query();

            if ($zoneId) {
                $residentIds = $this->getResidentIdsByZone($zoneId);
                if ($residentIds->isNotEmpty()) {
                    $query->whereHas('requester', function ($q) use ($residentIds) {
                        $q->whereIn('resident_id', $residentIds);
                    });
                } else {
                    return $this->respondSuccess([
                        'pending'   => 0,
                        'in_review' => 0,
                        'flagged'   => 0,
                        'approved'  => 0,
                        'rejected'  => 0,
                        'total'     => 0,
                    ]);
                }
            }

            $counts = [
                'pending' => (clone $query)
                    ->where('status', 'Pending')
                    ->whereNull('zl_clearance_status')
                    ->count(),
                'in_review' => (clone $query)->where('status', 'In Review')->count(),
                'flagged'   => (clone $query)->where('zl_clearance_status', 'flagged')->count(),
                'approved'  => (clone $query)->where('status', 'Approved')->count(),
                'rejected'  => (clone $query)->where('status', 'Rejected')->count(),
                'total'     => (clone $query)->count(),
            ];

            return $this->respondSuccess($counts);
        } catch (\Exception $e) {
            return $this->respondSuccess([
                'pending'   => 0,
                'in_review' => 0,
                'flagged'   => 0,
                'approved'  => 0,
                'rejected'  => 0,
                'total'     => 0,
            ]);
        }
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    private function syncToWebFrontDesk($certification)
    {
        try {
            $requester = $certification->requester;
            if (!$requester || !$requester->resident_id) return;

            $existingRequest = \App\Models\FrontDeskRequest::where('reference_number', $certification->reference_number)->first();

            if ($existingRequest) {
                $existingRequest->update([
                    'status' => 'processing',
                    'processed_by_user_id' => Auth::id(),
                    'processed_at' => now(),
                ]);
            } else {
                \App\Models\FrontDeskRequest::create([
                    'resident_id'          => $requester->resident_id,
                    'service_type'         => $certification->certificationType ? $certification->certificationType->name : 'Certificate',
                    'purpose'              => $certification->purpose,
                    'reference_number'     => $certification->reference_number,
                    'status'               => 'processing',
                    'created_by_user_id'   => Auth::id(),
                    'processed_by_user_id' => Auth::id(),
                    'processed_at'         => now(),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Sync to web front desk error: ' . $e->getMessage());
        }
    }

    private function notifyCertificateResident(
        Certification $certification,
        string $title,
        string $message,
        string $priority = 'normal'
    ): void {
        try {
            $residentId = $certification->requester?->resident_id;
            $user = $this->getUserByResidentId($residentId);
            if (!$user) return;

            $this->notifyUser(
                $user->id,
                $title,
                $message,
                'certificate',
                $priority,
                '/resident/certificates/' . $certification->id,
                Auth::id(),
                'certification',
                $certification->id
            );
        } catch (\Exception $e) {
            Log::error('Certificate notify resident error: ' . $e->getMessage());
        }
    }
}
