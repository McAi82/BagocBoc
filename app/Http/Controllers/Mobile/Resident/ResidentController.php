<?php
// app/Http/Controllers/Mobile/Resident/ResidentController.php

namespace App\Http\Controllers\Mobile\Resident;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\Certification;
use App\Models\CertificateRequester;
use App\Models\Clearance;
use App\Models\Penalty;
use App\Models\AccountActivation;
use App\Models\CertificationType;
use App\Models\Payment;
use App\Models\ComplianceRequirement;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ResidentController extends Controller
{
    use SendsNotifications;

    /**
     * Get resident profile
     */
    public function profile()
    {
        try {
            $residentId = Auth::user()->resident_id;

            if (!$residentId) {
                return $this->respondNotFound('Resident profile not found');
            }

            $resident = Resident::with(['households', 'households.address.barangayZone'])->find($residentId);

            if (!$resident) {
                return $this->respondNotFound('Resident not found');
            }

            return $this->respondSuccess($resident);
        } catch (\Exception $e) {
            Log::error('Profile error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch profile', null, 500);
        }
    }

    public function updateProfile(Request $request)
    {
        try {
            $residentId = Auth::user()->resident_id;

            if (!$residentId) {
                return $this->respondNotFound('Resident profile not found');
            }

            $resident = Resident::find($residentId);

            if (!$resident) {
                return $this->respondNotFound('Resident not found');
            }

            $validator = Validator::make($request->all(), [
                'phone_number' => 'nullable|string|max:20',
                'occupation' => 'nullable|string|max:255',
                'monthly_income' => 'nullable|numeric|min:0',
                'education_attainment' => 'nullable|string|max:255',
                'civil_status' => 'nullable|in:Single,Married,Widow,Legally Separated',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $resident->update($request->only([
                'phone_number',
                'occupation',
                'monthly_income',
                'education_attainment',
                'civil_status'
            ]));

            return $this->respondSuccess($resident, 'Profile updated successfully');
        } catch (\Exception $e) {
            Log::error('Profile update error: ' . $e->getMessage());
            return $this->respondError('Failed to update profile', null, 500);
        }
    }

    public function getCertificateTypes()
    {
        try {
            $types = CertificationType::where('is_active', true)->get();
            return $this->respondSuccess($types);
        } catch (\Exception $e) {
            Log::error('Certificate types error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch certificate types', null, 500);
        }
    }

    /**
     * Request certificate
     * ✅ Notifies Front Desk + Secretary
     */
    public function requestCertificate(Request $request)
    {
        try {
            $residentId = Auth::user()->resident_id;

            if (!$residentId) {
                return $this->respondNotFound('Resident profile not found');
            }

            $validator = Validator::make($request->all(), [
                'certification_type_id' => 'required|exists:certification_types,id',
                'purpose' => 'required|string|max:255',
                'details' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            DB::beginTransaction();

            try {
                $requester = CertificateRequester::firstOrCreate(
                    ['resident_id' => $residentId],
                    ['photo_id' => null]
                );

                $referenceNumber = $this->generateCertReferenceNumber();

                $certification = Certification::create([
                    'requester_id' => $requester->id,
                    'certification_type_id' => $request->certification_type_id,
                    'requested_by_user_id' => Auth::id(),
                    'purpose' => $request->purpose,
                    'details' => $request->details ?? '',
                    'file_url' => 'certificates/default.pdf',
                    'reference_number' => $referenceNumber,
                    'status' => 'Pending',
                ]);

                DB::commit();

                // ✅ Notify Front Desk + Secretary
                $type = CertificationType::find($request->certification_type_id);
                $resident = Resident::find($residentId);
                $residentName = $resident ? $resident->full_name : 'Resident';

                $this->notifyRoles(
                    ['Front Desk Clerk', 'Barangay Secretary'],
                    '📄 New Certificate Request',
                    "{$residentName} has requested a {$type->name} ({$referenceNumber}).",
                    'certificate',
                    'high',
                    '/certifications/' . $certification->id,
                    Auth::id()
                );

                return $this->respondSuccess(
                    $certification->load(['certificationType', 'requester']),
                    'Certificate requested successfully',
                    201
                );
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Certificate request error: ' . $e->getMessage());
            return $this->respondError('Failed to request certificate: ' . $e->getMessage(), null, 500);
        }
    }

    public function cancelCertificateRequest($id)
    {
        try {
            $residentId = Auth::user()->resident_id;

            $certification = Certification::where('id', $id)
                ->whereHas('requester', function ($query) use ($residentId) {
                    $query->where('resident_id', $residentId);
                })
                ->where('status', 'Pending')
                ->first();

            if (!$certification) {
                return $this->respondNotFound('Certificate not found or cannot be cancelled');
            }

            $certification->update(['status' => 'Cancelled']);

            return $this->respondSuccess(null, 'Certificate request cancelled successfully');
        } catch (\Exception $e) {
            Log::error('Certificate cancellation error: ' . $e->getMessage());
            return $this->respondError('Failed to cancel certificate', null, 500);
        }
    }

    public function getComplianceChecklist()
    {
        try {
            $residentId = Auth::user()->resident_id;

            if (!$residentId) {
                return $this->respondSuccess([], 'No resident profile found');
            }

            $zoneId = null;
            $resident = Resident::with('households.address.barangayZone')->find($residentId);

            if ($resident && $resident->households->first()) {
                $household = $resident->households->first();
                if ($household && $household->address) {
                    $zoneId = $household->address->zone;
                }
            }

            $compliance = ComplianceRequirement::where('resident_id', $residentId)
                ->where('is_active', 'active')
                ->orderBy('due_date', 'asc')
                ->get();

            if ($compliance->isEmpty() && $zoneId) {
                $compliance = ComplianceRequirement::where('zone_id', $zoneId)
                    ->where('is_active', 'active')
                    ->orderBy('due_date', 'asc')
                    ->get();
            }

            if ($compliance->isEmpty()) {
                $defaultCompliance = $this->getDefaultCompliance($residentId, $zoneId);
                return $this->respondSuccess($defaultCompliance);
            }

            $formattedCompliance = $compliance->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'description' => $item->description ?? '',
                    'zone' => $item->zone_id ? $this->getZoneName($item->zone_id) : 'N/A',
                    'requirement' => $item->requirement,
                    'penalty' => (float) ($item->penalty ?? 0),
                    'status' => $item->status ?? 'pending',
                    'due_date' => $item->due_date ? $item->due_date->toDateString() : now()->addMonth()->toDateString(),
                    'completed_at' => $item->completed_at ? $item->completed_at->toIso8601String() : null,
                ];
            });

            return $this->respondSuccess($formattedCompliance);
        } catch (\Exception $e) {
            Log::error('Compliance error: ' . $e->getMessage());

            $residentId = Auth::user()->resident_id;
            $zoneId = null;
            try {
                $resident = Resident::with('households.address')->find($residentId);
                if ($resident && $resident->households->first() && $resident->households->first()->address) {
                    $zoneId = $resident->households->first()->address->zone;
                }
            } catch (\Exception $ex) {
                Log::error('Error getting zone in fallback: ' . $ex->getMessage());
            }

            return $this->respondSuccess($this->getDefaultCompliance($residentId, $zoneId));
        }
    }

    public function myPenalties()
    {
        try {
            $residentId = Auth::user()->resident_id;

            if (!$residentId) {
                return $this->respondNotFound('Resident profile not found');
            }

            $penalties = Penalty::where('resident_id', $residentId)
                ->orderBy('created_at', 'desc')->get();

            $totalAmount = $penalties->where('status', 'pending')->sum('amount');

            return $this->respondSuccess([
                'data' => $penalties,
                'total_amount' => (float) $totalAmount,
                'count' => $penalties->where('status', 'pending')->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Penalties error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch penalties', null, 500);
        }
    }

    public function payPenalty($id)
    {
        try {
            $residentId = Auth::user()->resident_id;

            $penalty = Penalty::where('id', $id)
                ->where('resident_id', $residentId)
                ->where('status', 'pending')
                ->first();

            if (!$penalty) {
                return $this->respondNotFound('Penalty not found or already paid');
            }

            $penalty->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);

            return $this->respondSuccess($penalty, 'Penalty paid successfully');
        } catch (\Exception $e) {
            Log::error('Penalty payment error: ' . $e->getMessage());
            return $this->respondError('Failed to pay penalty', null, 500);
        }
    }

    public function myPayments()
    {
        try {
            $residentId = Auth::user()->resident_id;

            if (!$residentId) {
                return $this->respondNotFound('Resident profile not found');
            }

            $payments = Payment::where('resident_id', $residentId)
                ->orderBy('created_at', 'desc')->get();

            return $this->respondSuccess($payments);
        } catch (\Exception $e) {
            Log::error('Payments error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch payments', null, 500);
        }
    }

    public function processPayment(Request $request)
    {
        try {
            $residentId = Auth::user()->resident_id;

            if (!$residentId) {
                return $this->respondNotFound('Resident profile not found');
            }

            $validator = Validator::make($request->all(), [
                'request_id' => 'required|integer',
                'payment_method' => 'required|in:Cash,GCash',
                'amount' => 'required|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $payment = Payment::create([
                'resident_id' => $residentId,
                'processed_by_user_id' => Auth::id(),
                'or_number' => $this->generateORNumber(),
                'amount' => $request->amount,
                'payment_type' => 'Certificate',
                'payment_method' => $request->payment_method,
                'status' => 'completed',
                'paid_at' => now(),
                'payable_id' => $request->request_id,
                'payable_type' => Certification::class,
            ]);

            $certification = Certification::find($request->request_id);
            if ($certification) {
                $certification->update(['status' => 'Ready for Release']);
            }

            return $this->respondSuccess([
                'payment' => $payment,
                'receipt' => [
                    'or_number' => $payment->or_number,
                    'resident_name' => Auth::user()->resident ? Auth::user()->resident->full_name : 'N/A',
                    'amount' => (float) $payment->amount,
                    'payment_type' => $payment->payment_type,
                    'payment_method' => $payment->payment_method,
                    'date' => $payment->paid_at ? $payment->paid_at->format('Y-m-d') : now()->format('Y-m-d'),
                    'time' => $payment->paid_at ? $payment->paid_at->format('h:i A') : now()->format('h:i A'),
                    'processed_by' => Auth::user()->email,
                    'status' => $payment->status,
                ]
            ], 'Payment processed successfully');
        } catch (\Exception $e) {
            Log::error('Payment processing error: ' . $e->getMessage());
            return $this->respondError('Failed to process payment', null, 500);
        }
    }

    public function getPaymentReceipt($id)
    {
        try {
            $residentId = Auth::user()->resident_id;

            $payment = Payment::where('id', $id)
                ->where('resident_id', $residentId)->first();

            if (!$payment) {
                return $this->respondNotFound('Payment not found');
            }

            return $this->respondSuccess([
                'or_number' => $payment->or_number,
                'resident_name' => $payment->resident ? $payment->resident->full_name : 'N/A',
                'amount' => (float) $payment->amount,
                'payment_type' => $payment->payment_type,
                'payment_method' => $payment->payment_method,
                'date' => $payment->paid_at ? $payment->paid_at->format('Y-m-d') : $payment->created_at->format('Y-m-d'),
                'time' => $payment->paid_at ? $payment->paid_at->format('h:i A') : $payment->created_at->format('h:i A'),
                'processed_by' => $payment->processedBy ? $payment->processedBy->email : 'N/A',
                'status' => $payment->status,
            ]);
        } catch (\Exception $e) {
            Log::error('Receipt error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch receipt', null, 500);
        }
    }

    public function getStats()
    {
        try {
            $residentId = Auth::user()->resident_id;

            $stats = [
                'pendingCertificates' => Certification::whereHas('requester', function ($query) use ($residentId) {
                    $query->where('resident_id', $residentId);
                })
                    ->whereIn('status', ['Pending', 'In Review'])->count(),
                'totalPenalties' => (float) Penalty::where('resident_id', $residentId)
                    ->where('status', 'pending')->sum('amount'),
                'notifications' => 0,
                'pendingClearances' => Clearance::where('resident_id', $residentId)
                    ->where('status', 'pending')->count(),
                'totalCertificates' => Certification::whereHas('requester', function ($query) use ($residentId) {
                    $query->where('resident_id', $residentId);
                })->count(),
            ];

            return $this->respondSuccess($stats);
        } catch (\Exception $e) {
            Log::error('Stats error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch stats', null, 500);
        }
    }

    public function getClearance($id)
    {
        try {
            $residentId = Auth::user()->resident_id;

            $clearance = Clearance::where('id', $id)
                ->where('resident_id', $residentId)->first();

            if (!$clearance) {
                return $this->respondNotFound('Clearance not found');
            }

            $resident = Resident::find($residentId);
            $zone = null;
            if ($resident) {
                $zone = DB::table('resident_households')
                    ->join('households', 'resident_households.household_id', '=', 'households.id')
                    ->join('household_addresses', 'households.address_id', '=', 'household_addresses.id')
                    ->join('barangay_zones', 'household_addresses.zone', '=', 'barangay_zones.id')
                    ->where('resident_households.resident_id', $residentId)
                    ->where('resident_households.status', 'active')
                    ->value('barangay_zones.name');
            }

            return $this->respondSuccess([
                'id' => $clearance->id,
                'reference_number' => $clearance->reference_number,
                'resident_name' => $resident ? $resident->full_name : 'N/A',
                'resident_address' => $resident ? $resident->place_of_birth : 'N/A',
                'zone' => $zone ?? 'N/A',
                'purpose' => $clearance->purpose,
                'status' => $clearance->status,
                'amount' => (float) $clearance->amount,
                'issued_at' => $clearance->issued_at,
                'valid_until' => $clearance->valid_until,
                'zone_leader_name' => 'Zone Leader',
                'barangay_captain' => \App\Models\BarangayInfo::value('captain_name') ?? 'Barangay Captain',
            ]);
        } catch (\Exception $e) {
            Log::error('Clearance error: ' . $e->getMessage());
            return $this->respondError('Failed to fetch clearance', null, 500);
        }
    }

    public function cancelClearance($id)
    {
        try {
            $residentId = Auth::user()->resident_id;

            $clearance = Clearance::where('id', $id)
                ->where('resident_id', $residentId)
                ->where('status', 'pending')->first();

            if (!$clearance) {
                return $this->respondNotFound('Clearance not found or cannot be cancelled');
            }

            $clearance->update(['status' => 'cancelled']);

            return $this->respondSuccess(null, 'Clearance cancelled successfully');
        } catch (\Exception $e) {
            Log::error('Clearance cancellation error: ' . $e->getMessage());
            return $this->respondError('Failed to cancel clearance', null, 500);
        }
    }

    /**
     * Request account activation
     * ✅ Notifies Front Desk + Secretary
     */
    public function requestActivation(Request $request)
    {
        try {
            $residentId = Auth::user()->resident_id;

            if (!$residentId) {
                return $this->respondNotFound('Resident profile not found');
            }

            $validator = Validator::make($request->all(), [
                'id_type' => 'nullable|string',
                'id_front' => 'nullable|image|max:2048',
                'id_back' => 'nullable|image|max:2048',
            ]);

            if ($validator->fails()) {
                return $this->respondError('Validation error', $validator->errors(), 422);
            }

            $frontPath = $request->hasFile('id_front')
                ? $request->file('id_front')->store('id_documents', 'public')
                : null;

            $backPath = $request->hasFile('id_back')
                ? $request->file('id_back')->store('id_documents', 'public')
                : null;

            $referenceNumber = sprintf(
                '%03d %03d %03d %03d',
                random_int(0, 999),
                random_int(0, 999),
                random_int(0, 999),
                random_int(0, 999)
            );

            $activation = AccountActivation::create([
                'resident_id' => $residentId,
                'reference_number' => $referenceNumber,
                'id_type' => $request->id_type ?? null,
                'id_front_path' => $frontPath,
                'id_back_path' => $backPath,
                'status' => 'pending',
            ]);

            // ✅ Notify Front Desk + Secretary
            $resident = Resident::find($residentId);
            $residentName = $resident ? $resident->full_name : "Resident #{$residentId}";

            $this->notifyRoles(
                ['Front Desk Clerk', 'Barangay Secretary'],
                '🔔 New Account Activation Request',
                "{$residentName} has requested account activation. Reference: {$referenceNumber}.",
                'account',
                'high',
                '/settings/activations',
                Auth::id()
            );

            return $this->respondSuccess([
                'reference_number' => $activation->reference_number
            ], 'Account activation request submitted.', 201);
        } catch (\Exception $e) {
            Log::error('Activation request error: ' . $e->getMessage());
            return $this->respondError('Failed to request activation', null, 500);
        }
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    private function getDefaultCompliance($residentId, $zoneId = null)
    {
        $zoneName = $zoneId ? $this->getZoneName($zoneId) : 'N/A';

        return [
            [
                'id' => 0,
                'name' => 'Barangay Clearance',
                'description' => 'Required for business permits and employment',
                'zone' => $zoneName,
                'requirement' => 'Valid ID and proof of residency',
                'penalty' => 100.00,
                'status' => 'pending',
                'due_date' => now()->addMonth()->toDateString(),
                'completed_at' => null,
            ],
            [
                'id' => 1,
                'name' => 'Certificate of Residency',
                'description' => 'Required for government transactions and school enrollment',
                'zone' => $zoneName,
                'requirement' => 'Proof of residency and barangay clearance',
                'penalty' => 50.00,
                'status' => 'pending',
                'due_date' => now()->addMonths(2)->toDateString(),
                'completed_at' => null,
            ],
            [
                'id' => 2,
                'name' => 'Barangay ID Renewal',
                'description' => 'All residents must renew their barangay ID annually',
                'zone' => $zoneName,
                'requirement' => 'Updated photo and proof of residency',
                'penalty' => 75.00,
                'status' => 'pending',
                'due_date' => now()->addMonths(3)->toDateString(),
                'completed_at' => null,
            ],
            [
                'id' => 3,
                'name' => 'Community Clean-up Drive',
                'description' => 'Residents must participate in monthly clean-up activities',
                'zone' => $zoneName,
                'requirement' => 'Attendance at barangay clean-up drive',
                'penalty' => 200.00,
                'status' => 'pending',
                'due_date' => now()->addWeeks(2)->toDateString(),
                'completed_at' => null,
            ],
            [
                'id' => 4,
                'name' => 'Health Certificate',
                'description' => 'Required for food handlers and workers',
                'zone' => $zoneName,
                'requirement' => 'Updated health certificate from Barangay Health Center',
                'penalty' => 150.00,
                'status' => 'pending',
                'due_date' => now()->addMonth()->toDateString(),
                'completed_at' => null,
            ],
        ];
    }

    private function getZoneName($zoneId)
    {
        try {
            $zone = \App\Models\BarangayZone::find($zoneId);
            return $zone ? $zone->name : 'Zone ' . $zoneId;
        } catch (\Exception $e) {
            return 'Zone ' . $zoneId;
        }
    }

    private function generateCertReferenceNumber()
    {
        $year = date('Y');
        $prefix = 'CERT';
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $reference = "{$prefix}-{$year}-{$random}";

        while (Certification::where('reference_number', $reference)->exists()) {
            $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $reference = "{$prefix}-{$year}-{$random}";
        }

        return $reference;
    }

    private function generateORNumber()
    {
        $year = date('Y');
        $month = date('m');
        $day = date('d');
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $orNumber = "OR-{$year}{$month}{$day}-{$random}";

        while (Payment::where('or_number', $orNumber)->exists()) {
            $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $orNumber = "OR-{$year}{$month}{$day}-{$random}";
        }

        return $orNumber;
    }

    public function myCertificates()
    {
        $user = Auth::user();
        if (!$user || !$user->resident) {
            return $this->respondForbidden('Resident profile not found');
        }

        $certifications = Certification::with(['certificationType'])
            ->whereHas('requester', function ($q) use ($user) {
                $q->where('resident_id', $user->resident->id);
            })
            ->latest()
            ->get();

        return $this->respondSuccess($certifications);
    }

    /**
     * ✅ Get a single certificate by ID (with pdf_download_url).
     */
    public function getCertificateDetail($id)
    {
        $user = Auth::user();
        if (!$user || !$user->resident) {
            return $this->respondForbidden('Resident profile not found');
        }

        $certification = Certification::with(['certificationType'])
            ->whereHas('requester', function ($q) use ($user) {
                $q->where('resident_id', $user->resident->id);
            })
            ->find($id);

        if (!$certification) {
            return $this->respondNotFound('Certificate not found');
        }

        return $this->respondSuccess($certification);
    }

    /**
     * ✅ Stream the PDF for the authenticated resident.
     */
    public function downloadCertificate($id)
    {
        $user = Auth::user();
        if (!$user || !$user->resident) {
            return $this->respondForbidden('Resident profile not found');
        }

        $certification = Certification::with(['certificationType'])
            ->whereHas('requester', function ($q) use ($user) {
                $q->where('resident_id', $user->resident->id);
            })
            ->find($id);

        if (!$certification) {
            return $this->respondNotFound('Certificate not found');
        }

        if (!$certification->document_path) {
            return $this->respondError('Certificate PDF is not yet available', null, 404);
        }

        $filePath = storage_path('app/public/' . $certification->document_path);
        if (!file_exists($filePath)) {
            return $this->respondError('Certificate file not found', null, 404);
        }

        $downloadName = $certification->document_name
            ?? ('certificate_' . $certification->reference_number . '.pdf');

        return response()->download(
            $filePath,
            $downloadName,
            ['Content-Type' => 'application/pdf']
        );
    }
}
