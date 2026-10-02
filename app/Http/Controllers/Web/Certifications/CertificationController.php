<?php
// app/Http/Controllers/Web/Certifications/CertificationController.php

namespace App\Http\Controllers\Web\Certifications;

use App\Http\Controllers\Controller;
use App\Models\Certification;
use App\Models\CertificationType;
use App\Models\CertificateRequester;
use App\Traits\GeneratesReferenceNumbers;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class CertificationController extends Controller
{
    use SendsNotifications, GeneratesReferenceNumbers;

    // ============================================
    // LIST / SHOW
    // ============================================

    public function index(Request $request)
    {
        $query = Certification::with([
            'requester',
            'requester.resident',
            'certificationType',
            'requestedBy',
            'processedBy',
        ]);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // ✅ Filter by ZL clearance state
        if ($request->filled('zl_status')) {
            if ($request->zl_status === 'unreviewed') {
                $query->whereNull('zl_clearance_status');
            } elseif ($request->zl_status === 'any') {
                // no-op
            } else {
                $query->where('zl_clearance_status', $request->zl_status);
            }
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'LIKE', "%{$search}%")
                    ->orWhereHas('requester.resident', function ($rq) use ($search) {
                        $rq->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%")
                            ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
                    });
            });
        }

        $certifications = $query->orderBy('created_at', 'desc')->paginate(15);

        $certifications->getCollection()->transform(function ($cert) {
            $resident = $cert->requester?->resident;
            return [
                'id'                     => $cert->id,
                'reference_number'       => $cert->reference_number,
                'resident_id'            => $resident?->id,
                'resident_name'          => $resident ? $resident->full_name : 'Unknown',
                'first_name'             => $resident?->first_name,
                'last_name'              => $resident?->last_name,
                'certification_type_id'  => $cert->certification_type_id,
                'certification_type'     => $cert->certificationType,
                'purpose'                => $cert->purpose,
                'details'                => $cert->details,
                'status'                 => $cert->status,

                'created_at'             => $cert->created_at,
                'updated_at'             => $cert->updated_at,
                'approved_at'            => $cert->approved_at,
                'released_at'            => $cert->released_at,
                'received_at'            => $cert->received_at,

                'file_url'               => $cert->file_url,
                'document_path'          => $cert->document_path,
                'document_name'          => $cert->document_name,
                'pdf_url'                => $cert->pdf_url,
                'pdf_download_url'       => $cert->pdf_download_url,

                'download_token'         => $cert->download_token,
                'download_token_expires_at' => $cert->download_token_expires_at,
                'downloaded_at'          => $cert->downloaded_at,
                'is_downloadable'        => $cert->is_downloadable,
                'has_been_downloaded'    => $cert->has_been_downloaded,

                'payment_method'         => $cert->payment_method,
                'payment_status'         => $cert->payment_status,
                'payment_reference'      => $cert->payment_reference,

                // ✅ ZL clearance fields
                'zl_clearance_status'    => $cert->zl_clearance_status,
                'zl_clearance_notes'     => $cert->zl_clearance_notes,
                'zl_clearance_date'      => $cert->zl_clearance_date,

                'submission_channel'     => $cert->submission_channel,

                'remarks'                => $cert->remarks,
                'requester'              => $cert->requester,
                'resident'               => $resident,
                'requested_by'           => $cert->requestedBy,
                'processed_by'           => $cert->processedBy,
            ];
        });

        return $this->respondSuccess($certifications);
    }

    public function show($id)
    {
        $certification = Certification::with([
            'requester',
            'requester.resident',
            'certificationType',
            'requestedBy',
            'processedBy',
        ])->find($id);

        if (!$certification) {
            return $this->respondNotFound('Certification not found');
        }

        return $this->respondSuccess($certification);
    }

    // ============================================
    // TYPES
    // ============================================

    public function types()
    {
        $types = CertificationType::where('is_active', true)->get();
        return $this->respondSuccess($types);
    }

    public function allTypes()
    {
        $types = CertificationType::all();
        return $this->respondSuccess($types);
    }

    public function storeType(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:certification_types,name',
            'description' => 'nullable|string',
            'fee' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $type = CertificationType::create([
            'name' => $request->name,
            'description' => $request->description,
            'fee' => $request->fee ?? 0,
            'is_active' => $request->is_active ?? true,
        ]);

        return $this->respondSuccess($type, 'Certification type created successfully', 201);
    }

    public function updateType(Request $request, $id)
    {
        $type = CertificationType::find($id);

        if (!$type) {
            return $this->respondNotFound('Certification type not found');
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255|unique:certification_types,name,' . $id,
            'description' => 'nullable|string',
            'fee' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $type->update($request->all());

        return $this->respondSuccess($type, 'Certification type updated successfully');
    }

    public function deleteType($id)
    {
        $type = CertificationType::find($id);

        if (!$type) {
            return $this->respondNotFound('Certification type not found');
        }

        if ($type->certifications()->count() > 0) {
            return $this->respondError('Cannot delete type with existing certifications', null, 422);
        }

        $type->delete();

        return $this->respondSuccess(null, 'Certification type deleted successfully');
    }

    // ============================================
    // CREATE
    // ============================================

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resident_id' => 'required|exists:residents,id',
            'certification_type_id' => 'required|exists:certification_types,id',
            'purpose' => 'nullable|string|max:255',
            'details' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $requester = CertificateRequester::firstOrCreate(
            ['resident_id' => $request->resident_id],
            ['photo_id' => null]
        );

        $certification = Certification::create([
            'requester_id' => $requester->id,
            'certification_type_id' => $request->certification_type_id,
            'requested_by_user_id' => Auth::id(),
            'purpose' => $request->purpose,
            'details' => $request->details,
            'file_url' => 'certificates/default.pdf',
            'reference_number' => $this->generateReference('CERT', Certification::class),
            'status' => 'Pending',

            // ✅ Explicit nulls — never inherit stale payment state
            'payment_status'    => null,
            'payment_method'    => null,
            'payment_reference' => null,
        ]);

        $this->notifyRoles(
            ['Front Desk Clerk', 'Barangay Secretary'],
            '📄 New Certificate Request',
            "A new certificate request ({$certification->reference_number}) is awaiting processing.",
            'certificate',
            'high',
            '/certifications/' . $certification->id,
            Auth::id()
        );

        return $this->respondSuccess(
            $certification->load(['requester.resident', 'certificationType']),
            'Certification requested successfully',
            201
        );
    }

    // ============================================
    // SECRETARY APPROVAL
    // ============================================

    public function approve($id)
    {
        $certification = Certification::find($id);

        if (!$certification) {
            return $this->respondNotFound('Certification not found');
        }

        if (!$certification->canSecretaryApprove()) {
            return $this->respondError(
                'This certification has already been processed.',
                null,
                422
            );
        }

        // ✅ Require the ZL to have cleared it first (comment this out
        //    if the Secretary should be allowed to override directly).
        if (!$certification->isZlCleared()) {
            return $this->respondError(
                'This request has not been cleared by the Zone Leader yet. ' .
                'Ask the Zone Leader to review it first.',
                null,
                422
            );
        }

        $certification->update([
            'status'               => 'Approved',
            'processed_by_user_id' => Auth::id(),
            'approved_at'          => now(),
        ]);

        $this->notifyResident(
            $certification,
            'Certificate Request Approved',
            "Your {$certification->certificationType->name} request has been approved.",
            'high',
            '/resident/certificates/' . $certification->id
        );

        return $this->respondSuccess(
            $certification->load(['requester.resident', 'certificationType']),
            'Certification approved successfully'
        );
    }

    public function reject(Request $request, $id)
    {
        $certification = Certification::find($id);

        if (!$certification) {
            return $this->respondNotFound('Certification not found');
        }

        if (!$certification->canApprove()) {
            return $this->respondError(
                'Only pending or in-review certifications can be rejected',
                null,
                422
            );
        }

        $validator = Validator::make($request->all(), [
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $certification->update([
            'status'               => 'Rejected',
            'processed_by_user_id' => Auth::id(),
            'remarks'              => $request->remarks ?? 'Rejected by barangay official',
        ]);

        $this->notifyResident(
            $certification,
            'Certificate Request Rejected',
            "Your {$certification->certificationType->name} request has been rejected. Reason: " . ($request->remarks ?? 'Not specified'),
            'high'
        );

        return $this->respondSuccess($certification, 'Certification rejected');
    }

    // ============================================
    // DOCUMENT GENERATION
    // ============================================

    public function generateDocument(Request $request, $id)
    {
        $certification = Certification::find($id);

        if (!$certification) {
            return $this->respondNotFound('Certification not found');
        }

        if (!$certification->canCreateDocument()) {
            return $this->respondError(
                'Only approved certifications can have documents generated',
                null,
                422
            );
        }

        $validator = Validator::make($request->all(), [
            'document_name' => 'required|string|max:255',
            'document_content' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $certification->update([
            'document_name' => $request->document_name,
            'processed_by_user_id' => Auth::id(),
        ]);

        return $this->respondSuccess(
            $certification->fresh()->load(['requester.resident', 'certificationType']),
            'Ready to preview. Save the PDF to make it downloadable.'
        );
    }

    public function uploadPdf(Request $request, $id)
    {
        $certification = Certification::find($id);

        if (!$certification) {
            return $this->respondNotFound('Certification not found');
        }

        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:10240',
            'document_name' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        try {
            if (
                $certification->document_path
                && Storage::disk('public')->exists($certification->document_path)
            ) {
                Storage::disk('public')->delete($certification->document_path);
            }

            $safeRef = preg_replace('/[^A-Za-z0-9\-_]/', '_', $certification->reference_number);
            $filename = 'certificates/' . $safeRef . '_' . time() . '.pdf';

            $file = $request->file('pdf');
            Storage::disk('public')->put($filename, file_get_contents($file->getRealPath()));

            $newStatus = $certification->status;
            if ($newStatus === 'Approved') {
                $newStatus = 'Ready for Release';
            }

            $certification->document_path = $filename;
            $certification->document_name = $request->document_name
                ?? ($certification->certificationType?->name . '_' . $safeRef . '.pdf');
            $certification->pdf_url = Storage::url($filename);
            $certification->processed_by_user_id = Auth::id();
            $certification->status = $newStatus;

            if ($certification->status === 'Released' && !$certification->download_token) {
                $certification->download_token = bin2hex(random_bytes(32));
                $certification->download_token_expires_at = now()->addHours(72);
                $certification->downloaded_at = null;
            }

            $certification->save();

            Log::info('Certification PDF uploaded', [
                'certification_id' => $certification->id,
                'filename' => $filename,
                'size_bytes' => $file->getSize(),
                'new_status' => $newStatus,
                'has_token' => !empty($certification->download_token),
                'uploaded_by' => Auth::id(),
            ]);

            return $this->respondSuccess(
                $certification->fresh()->load(['requester.resident', 'certificationType']),
                'PDF uploaded successfully',
                200
            );
        } catch (\Exception $e) {
            Log::error('PDF upload failed: ' . $e->getMessage());
            return $this->respondError('Failed to upload PDF: ' . $e->getMessage(), null, 500);
        }
    }

    // ============================================
    // RELEASE / RECEIVE / DOWNLOAD
    // ============================================

    public function reissue($id)
    {
        $certification = Certification::find($id);

        if (!$certification) {
            return $this->respondNotFound('Certification not found');
        }

        if (!$certification->document_path) {
            return $this->respondError('No document has been uploaded for this certification.', null, 422);
        }

        $certification->update([
            'downloaded_at' => null,
            'download_token' => null,
            'download_token_expires_at' => null,
        ]);

        $certification->generateDownloadToken(72);

        $this->notifyResident(
            $certification,
            'Certificate Reissued — New One-Time Download Link',
            "Your {$certification->certificationType->name} ({$certification->reference_number}) has been reissued. " .
                "Download it using this new link within 72 hours. This link can only be used ONCE.",
            'high',
            $certification->pdf_download_url
        );

        return $this->respondSuccess(
            $certification->fresh()->load(['requester.resident', 'certificationType']),
            'Certificate reissued successfully'
        );
    }

    public function release($id)
    {
        $certification = Certification::find($id);

        if (!$certification) {
            return $this->respondNotFound('Certification not found');
        }

        if (!$certification->canRelease()) {
            return $this->respondError('Only certifications with documents can be released', null, 422);
        }

        $certification->update([
            'status' => 'Released',
            'processed_by_user_id' => Auth::id(),
            'issued_at' => now(),
            'released_at' => now(),
        ]);

        $certification->generateDownloadToken(72);

        $this->notifyResident(
            $certification,
            'Certificate Ready — One-Time Download Link',
            "Your {$certification->certificationType->name} ({$certification->reference_number}) is ready. " .
                "Download it using this link within 72 hours. This link can only be used ONCE.",
            'high',
            $certification->pdf_download_url
        );

        return $this->respondSuccess(
            $certification->fresh()->load(['requester.resident', 'certificationType']),
            'Document released successfully'
        );
    }

    public function receive($id)
    {
        $certification = Certification::find($id);

        if (!$certification) {
            return $this->respondNotFound('Certification not found');
        }

        if (!$certification->canReceive()) {
            return $this->respondError('Only released documents can be received', null, 422);
        }

        $certification->update(['received_at' => now()]);

        return $this->respondSuccess([
            'certification' => $certification,
            'download_url' => $certification->document_path ? Storage::url($certification->document_path) : null,
        ], 'Document received successfully');
    }

    public function download($id)
    {
        $certification = Certification::find($id);

        if (!$certification) {
            return $this->respondNotFound('Certification not found');
        }

        if (!$certification->document_path) {
            return $this->respondNotFound('No document available for download');
        }

        if (!$certification->received_at) {
            $certification->update(['received_at' => now()]);
        }

        $filePath = storage_path('app/public/' . $certification->document_path);

        if (!file_exists($filePath)) {
            return $this->respondNotFound('Document file not found');
        }

        return response()->download($filePath, $certification->document_name ?? 'certificate.pdf');
    }

    // ============================================
    // FLOW STATUS
    // ============================================

    public function getFlowStatus($id)
    {
        $certification = Certification::with(['requester.resident', 'certificationType'])->find($id);

        if (!$certification) {
            return $this->respondNotFound('Certification not found');
        }

        $flow = [
            'step' => 1,
            'steps' => [
                ['step' => 1, 'name' => 'Request', 'status' => 'completed', 'description' => 'Resident requested certification', 'date' => $certification->created_at],
                ['step' => 2, 'name' => 'ZL Clearance', 'status' => $certification->zl_clearance_status === 'cleared' ? 'completed' : ($certification->zl_clearance_status === 'flagged' ? 'rejected' : 'pending'), 'description' => 'Zone Leader clears or flags the request', 'date' => $certification->zl_clearance_date],
                ['step' => 3, 'name' => 'Approval', 'status' => $certification->approved_at ? 'completed' : ($certification->status === 'Rejected' ? 'rejected' : 'pending'), 'description' => 'Secretary approves or rejects the request', 'date' => $certification->approved_at],
                ['step' => 4, 'name' => 'Document Creation', 'status' => $certification->document_path ? 'completed' : 'pending', 'description' => 'Secretary generates the document', 'date' => $certification->updated_at],
                ['step' => 5, 'name' => 'Release', 'status' => $certification->released_at ? 'completed' : 'pending', 'description' => 'Secretary releases the document', 'date' => $certification->released_at],
                ['step' => 6, 'name' => 'Receive', 'status' => $certification->received_at ? 'completed' : 'pending', 'description' => 'Resident receives and downloads the document', 'date' => $certification->received_at],
            ],
            'current_step' => $this->getCurrentStep($certification),
            'status' => $certification->status,
        ];

        return $this->respondSuccess($flow);
    }

    private function getCurrentStep($certification)
    {
        if ($certification->received_at) return 6;
        if ($certification->released_at) return 5;
        if ($certification->document_path) return 4;
        if ($certification->approved_at) return 3;
        if ($certification->zl_clearance_status === 'cleared') return 2;
        if ($certification->status === 'Rejected') return -1;
        return 1;
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    private function notifyResident(
        Certification $certification,
        string $title,
        string $message,
        string $priority = 'normal',
        ?string $deepLink = null
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
                $deepLink,
                Auth::id(),
                'certification',
                $certification->id
            );
        } catch (\Exception $e) {
            Log::error('Certification notify resident error: ' . $e->getMessage());
        }
    }
}