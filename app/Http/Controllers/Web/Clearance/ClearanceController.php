<?php

namespace App\Http\Controllers\Web\Clearance;

use App\Http\Controllers\Controller;
use App\Models\Clearance;
use App\Models\ClearanceConfiguration;
use App\Models\Resident;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ClearanceController extends Controller
{
    use SendsNotifications;

    /**
     * List all clearances
     */
    public function index(Request $request)
    {
        $query = Clearance::with(['resident', 'processedBy']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'LIKE', "%{$search}%")
                    ->orWhereHas('resident', function ($rq) use ($search) {
                        $rq->where('first_name', 'LIKE', "%{$search}%")
                            ->orWhere('last_name', 'LIKE', "%{$search}%");
                    });
            });
        }

        $clearances = $query->latest()->paginate(15);

        return $this->respondSuccess($clearances);
    }

    /**
     * STEP 1: Issue/Request Clearance
     * ✅ Notifies Front Desk and Secretary of new request
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resident_id' => 'required|exists:residents,id',
            'purpose' => 'nullable|string|max:255',
            'amount' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $config = ClearanceConfiguration::first();
        $amount = $request->amount ?? ($config->default_fee ?? 50);

        $clearance = Clearance::create([
            'resident_id' => $request->resident_id,
            'processed_by_user_id' => Auth::id(),
            'reference_number' => $this->generateReferenceNumber(),
            'purpose' => $request->purpose,
            'amount' => $amount,
            'status' => 'pending',
            'valid_until' => now()->addYear(),
        ]);

        // ✅ Notify Front Desk + Secretary
        $resident = Resident::find($request->resident_id);
        $residentName = $resident ? "{$resident->first_name} {$resident->last_name}" : "Resident";

        $this->notifyRoles(
            ['Front Desk Clerk', 'Barangay Secretary'],
            '📄 New Clearance Request',
            "A new barangay clearance request ({$clearance->reference_number}) from {$residentName} is awaiting processing.",
            'clearance',
            'high',
            '/clearances/' . $clearance->id,
            Auth::id()
        );

        return $this->respondSuccess(
            $clearance->load('resident'),
            'Clearance requested successfully',
            201
        );
    }

    /**
     * Show clearance
     */
    public function show($id)
    {
        $clearance = Clearance::with(['resident', 'processedBy'])->find($id);

        if (!$clearance) {
            return $this->respondNotFound('Clearance not found');
        }

        return $this->respondSuccess($clearance);
    }

    /**
     * STEP 2: Approve Clearance
     * ✅ Notifies resident
     */
    public function approve($id)
    {
        $clearance = Clearance::find($id);

        if (!$clearance) {
            return $this->respondNotFound('Clearance not found');
        }

        if (!$clearance->canApprove()) {
            return $this->respondError('Only pending clearances can be approved', null, 422);
        }

        $clearance->update([
            'status' => 'approved',
            'processed_by_user_id' => Auth::id(),
            'approved_at' => now(),
        ]);

        // ✅ Notify resident
        $this->notifyResident(
            $clearance,
            'Barangay Clearance Approved',
            "Your Barangay Clearance request ({$clearance->reference_number}) has been approved.",
            'high',
            '/resident/clearance/' . $clearance->id
        );

        return $this->respondSuccess($clearance, 'Clearance approved successfully');
    }

    /**
     * STEP 3: Generate Document
     * ✅ Notifies resident that document is ready
     */
    public function generateDocument(Request $request, $id)
    {
        $clearance = Clearance::find($id);

        if (!$clearance) {
            return $this->respondNotFound('Clearance not found');
        }

        if (!$clearance->canCreateDocument()) {
            return $this->respondError('Only approved clearances can have documents generated', null, 422);
        }

        $validator = Validator::make($request->all(), [
            'document_name' => 'required|string|max:255',
            'document_content' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf,doc,docx|max:5120',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $documentPath = null;

        if ($request->hasFile('file')) {
            $documentPath = $request->file('file')->store('clearances/documents', 'public');
        }

        if ($request->filled('document_content')) {
            $documentPath = $this->generateClearancePDF($clearance, $request->document_content);
        }

        if (!$documentPath) {
            $documentPath = $this->generateClearancePDF($clearance);
        }

        $clearance->update([
            'status' => 'ready_for_release',
            'document_path' => $documentPath,
            'document_name' => $request->document_name ?? 'Barangay_Clearance_' . $clearance->reference_number . '.pdf',
            'processed_by_user_id' => Auth::id(),
        ]);

        // ✅ Notify resident that document is ready
        $this->notifyResident(
            $clearance,
            'Barangay Clearance Ready',
            "Your Barangay Clearance ({$clearance->reference_number}) is ready. Please visit the barangay hall to claim it.",
            'normal',
            '/resident/clearance/' . $clearance->id
        );

        return $this->respondSuccess(
            $clearance->load('resident'),
            'Document generated successfully'
        );
    }

    /**
     * STEP 4: Release Document
     * ✅ Notifies resident
     */
    public function release($id)
    {
        $clearance = Clearance::find($id);

        if (!$clearance) {
            return $this->respondNotFound('Clearance not found');
        }

        if (!$clearance->canRelease()) {
            return $this->respondError('Only clearances with documents can be released', null, 422);
        }

        $clearance->update([
            'status' => 'released',
            'issued_at' => now(),
            'released_at' => now(),
            'processed_by_user_id' => Auth::id(),
        ]);

        // ✅ Notify resident
        $this->notifyResident(
            $clearance,
            'Barangay Clearance Released',
            "Your Barangay Clearance ({$clearance->reference_number}) has been released and is available for download.",
            'high',
            '/resident/clearance/' . $clearance->id
        );

        return $this->respondSuccess($clearance, 'Clearance released successfully');
    }

    /**
     * STEP 5: Receive Document
     */
    public function receive($id)
    {
        $clearance = Clearance::find($id);

        if (!$clearance) {
            return $this->respondNotFound('Clearance not found');
        }

        if (!$clearance->canReceive()) {
            return $this->respondError('Only released clearances can be received', null, 422);
        }

        $clearance->update(['received_at' => now()]);

        return $this->respondSuccess([
            'clearance' => $clearance,
            'download_url' => $clearance->document_path ? Storage::url($clearance->document_path) : null,
        ], 'Clearance received successfully');
    }

    /**
     * Download Document
     */
    public function download($id)
    {
        $clearance = Clearance::find($id);

        if (!$clearance) {
            return $this->respondNotFound('Clearance not found');
        }

        if (!$clearance->document_path) {
            return $this->respondNotFound('No document available for download');
        }

        if (!$clearance->received_at) {
            $clearance->update(['received_at' => now()]);
        }

        $filePath = storage_path('app/public/' . $clearance->document_path);

        if (!file_exists($filePath)) {
            return $this->respondNotFound('Document file not found');
        }

        return response()->download(
            $filePath,
            $clearance->document_name ?? 'barangay_clearance.pdf'
        );
    }

    /**
     * Reject Clearance
     * ✅ Notifies resident
     */
    public function reject(Request $request, $id)
    {
        $clearance = Clearance::find($id);

        if (!$clearance) {
            return $this->respondNotFound('Clearance not found');
        }

        if (!$clearance->canApprove()) {
            return $this->respondError('Only pending clearances can be rejected', null, 422);
        }

        $validator = Validator::make($request->all(), [
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $clearance->update([
            'status' => 'rejected',
            'remarks' => $request->remarks ?? 'Rejected by barangay official',
            'processed_by_user_id' => Auth::id(),
        ]);

        // ✅ Notify resident
        $this->notifyResident(
            $clearance,
            'Barangay Clearance Rejected',
            "Your Barangay Clearance request ({$clearance->reference_number}) was rejected. Reason: " . ($request->remarks ?? 'Not specified'),
            'high'
        );

        return $this->respondSuccess($clearance, 'Clearance rejected');
    }

    /**
     * Get flow status
     */
    public function getFlowStatus($id)
    {
        $clearance = Clearance::with(['resident'])->find($id);

        if (!$clearance) {
            return $this->respondNotFound('Clearance not found');
        }

        $flow = [
            'step' => 1,
            'steps' => [
                ['step' => 1, 'name' => 'Request', 'status' => 'completed', 'description' => 'Resident requested clearance', 'date' => $clearance->created_at],
                ['step' => 2, 'name' => 'Approval', 'status' => $clearance->approved_at ? 'completed' : ($clearance->status === 'rejected' ? 'rejected' : 'pending'), 'description' => 'Secretary approves or rejects the request', 'date' => $clearance->approved_at],
                ['step' => 3, 'name' => 'Document Creation', 'status' => $clearance->document_path ? 'completed' : 'pending', 'description' => 'Secretary generates the document', 'date' => $clearance->updated_at],
                ['step' => 4, 'name' => 'Release', 'status' => $clearance->released_at ? 'completed' : 'pending', 'description' => 'Secretary releases the document', 'date' => $clearance->released_at],
                ['step' => 5, 'name' => 'Receive', 'status' => $clearance->received_at ? 'completed' : 'pending', 'description' => 'Resident receives and downloads the document', 'date' => $clearance->received_at],
            ],
            'current_step' => $this->getCurrentStep($clearance),
            'status' => $clearance->status,
        ];

        return $this->respondSuccess($flow);
    }

    private function getCurrentStep($clearance)
    {
        if ($clearance->received_at) return 5;
        if ($clearance->released_at) return 4;
        if ($clearance->document_path) return 3;
        if ($clearance->approved_at) return 2;
        if ($clearance->status === 'rejected') return -1;
        return 1;
    }

    private function generateClearancePDF($clearance, $content = null)
    {
        $resident = $clearance->resident;
        $config = ClearanceConfiguration::first();

        if ($content) {
            // use provided content
        } else {
            $content = "BARANGAY CLEARANCE\n==================\n\n";
            $content .= "Clearance Number: " . $clearance->reference_number . "\n";
            $content .= "Resident: " . ($resident ? $resident->first_name . ' ' . $resident->last_name : 'N/A') . "\n";
            $content .= "Address: " . ($resident ? $resident->place_of_birth : 'N/A') . "\n";
            $content .= "Purpose: " . ($clearance->purpose ?? 'N/A') . "\n";
            $content .= "Amount Paid: ₱" . number_format($clearance->amount, 2) . "\n";
            $content .= "Date Issued: " . now()->format('Y-m-d H:i:s') . "\n";
            $content .= "Valid Until: " . ($clearance->valid_until ? $clearance->valid_until->format('Y-m-d') : 'N/A') . "\n";
            $content .= "\n---\n";
            $content .= "This clearance is issued by the Barangay of Bagocboc.\n";
            $content .= "Punong Barangay: " . ($config->punong_barangay_name ?? 'N/A') . "\n";
            $content .= "Barangay Secretary: " . ($config->barangay_secretary_name ?? 'N/A');
        }

        $fileName = 'clearances/' . $clearance->reference_number . '.txt';
        Storage::disk('public')->put($fileName, $content);

        return $fileName;
    }

    public function getConfiguration()
    {
        $config = ClearanceConfiguration::first();

        if (!$config) {
            $config = ClearanceConfiguration::create([
                'default_fee' => 50,
                'punong_barangay_name' => 'Marcos P. Gonzales',
                'barangay_secretary_name' => 'Concordio A. Esber',
                'header_text' => 'Republic of the Philippines - Province of Misamis Oriental - Municipality of Opol',
                'footer_text' => 'This clearance is valid for one year from the date of issuance.',
                'is_active' => true,
            ]);
        }

        return $this->respondSuccess($config);
    }

    public function updateConfiguration(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'default_fee' => 'nullable|numeric|min:0',
            'punong_barangay_name' => 'nullable|string|max:255',
            'barangay_secretary_name' => 'nullable|string|max:255',
            'header_text' => 'nullable|string',
            'footer_text' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $config = ClearanceConfiguration::first();

        if (!$config) {
            $config = ClearanceConfiguration::create($request->all());
        } else {
            $config->update($request->all());
        }

        return $this->respondSuccess($config, 'Configuration updated successfully');
    }

    private function generateReferenceNumber()
    {
        $year = date('Y');
        $prefix = 'CLR';
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $reference = "{$prefix}-{$year}-{$random}";

        while (Clearance::where('reference_number', $reference)->exists()) {
            $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $reference = "{$prefix}-{$year}-{$random}";
        }

        return $reference;
    }

    /**
     * ✅ Notify the resident who owns the clearance
     */
    private function notifyResident(
        Clearance $clearance,
        string $title,
        string $message,
        string $priority = 'normal',
        ?string $deepLink = null
    ): void {
        try {
            $user = $this->getUserByResidentId($clearance->resident_id);
            if (!$user) return;

            $this->notifyUser(
                $user->id,
                $title,
                $message,
                'clearance',
                $priority,
                $deepLink,
                Auth::id(),
                'clearance',
                $clearance->id
            );
        } catch (\Exception $e) {
            Log::error('Clearance notify resident error: ' . $e->getMessage());
        }
    }
}
