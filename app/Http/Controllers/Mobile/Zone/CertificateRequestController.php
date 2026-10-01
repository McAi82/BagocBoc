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
                    'id' => $cert->id,
                    'resident_id' => $resident ? $resident->id : null,
                    'resident_name' => $resident ? $resident->full_name : 'Unknown',
                    'certificate_type' => $cert->certificationType ? $cert->certificationType->name : 'N/A',
                    'certification_type_id' => $cert->certification_type_id,
                    'purpose' => $cert->purpose ?? 'N/A',
                    'status' => strtolower($cert->status),
                    'requested_at' => $cert->created_at ? $cert->created_at->toISOString() : now()->toISOString(),
                    'household_number' => $household ? $household->household_number : null,
                    'zone' => $zoneName ?? 'N/A',
                    'fee' => $cert->certificationType ? (float) $cert->certificationType->fee : 0,
                ];
            });

            return $this->respondSuccess($formattedRequests);
        } catch (\Exception $e) {
            Log::error('Certificate requests error: ' . $e->getMessage());
            return $this->respondSuccess([], 'No certificate requests found');
        }
    }

    public function reject(Request $request, $id)
    {
        try {
            $validator = Validator::make($request->all(), [
                'reason' => 'required|string|max:500',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $certification = Certification::find($id);

            if (!$certification) {
                return $this->respondNotFound('Certificate request not found');
            }

            if ($certification->status !== 'Pending' && $certification->status !== 'In Review') {
                return $this->respondError('Only pending requests can be rejected', null, 422);
            }

            $certification->update([
                'status' => 'Rejected',
                'processed_by_user_id' => Auth::id(),
                'remarks' => $request->reason,
            ]);

            $this->notifyCertificateResident(
                $certification,
                '❌ Certificate Request Rejected',
                "Your certificate request ({$certification->reference_number}) was rejected by the Zone Leader. Reason: {$request->reason}",
                'high'
            );

            return $this->respondSuccess(
                $certification->load(['certificationType', 'requester']),
                'Certificate request rejected successfully'
            );
        } catch (\Exception $e) {
            Log::error('Certificate rejection error: ' . $e->getMessage());
            return $this->respondError('Failed to reject certificate', null, 500);
        }
    }

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
                    'id' => $cert->id,
                    'resident_id' => $resident ? $resident->id : null,
                    'resident_name' => $resident ? $resident->full_name : 'Unknown',
                    'certificate_type' => $cert->certificationType ? $cert->certificationType->name : 'N/A',
                    'purpose' => $cert->purpose ?? 'N/A',
                    'status' => strtolower($cert->status),
                    'requested_at' => $cert->created_at ? $cert->created_at->toISOString() : now()->toISOString(),
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
                        'pending' => 0,
                        'approved' => 0,
                        'rejected' => 0,
                        'total' => 0,
                    ]);
                }
            }

            $counts = [
                'pending' => (clone $query)->whereIn('status', ['Pending', 'In Review'])->count(),
                'approved' => (clone $query)->where('status', 'Approved')->count(),
                'rejected' => (clone $query)->where('status', 'Rejected')->count(),
                'total' => (clone $query)->count(),
            ];

            return $this->respondSuccess($counts);
        } catch (\Exception $e) {
            return $this->respondSuccess(['pending' => 0, 'approved' => 0, 'rejected' => 0, 'total' => 0]);
        }
    }

    public function approve($id)
    {
        try {
            $certification = Certification::find($id);

            if (!$certification) {
                return $this->respondNotFound('Certificate request not found');
            }

            if ($certification->status !== 'Pending' && $certification->status !== 'In Review') {
                return $this->respondError('Only pending requests can be approved', null, 422);
            }

            $certification->update([
                'status' => 'Approved',
                'processed_by_user_id' => Auth::id(),
                'approved_at' => now(),
            ]);

            $this->syncToWebFrontDesk($certification);

            $this->notifyCertificateResident(
                $certification,
                '✅ Certificate Request Approved',
                "Your certificate request ({$certification->reference_number}) has been approved by the Zone Leader.",
                'high'
            );

            return $this->respondSuccess(
                $certification->load(['certificationType', 'requester']),
                'Certificate request approved successfully'
            );
        } catch (\Exception $e) {
            Log::error('Certificate approval error: ' . $e->getMessage());
            return $this->respondError('Failed to approve certificate', null, 500);
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
                    'resident_id' => $requester->resident_id,
                    'service_type' => $certification->certificationType ? $certification->certificationType->name : 'Certificate',
                    'purpose' => $certification->purpose,
                    'reference_number' => $certification->reference_number,
                    'status' => 'processing',
                    'created_by_user_id' => Auth::id(),
                    'processed_by_user_id' => Auth::id(),
                    'processed_at' => now(),
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
