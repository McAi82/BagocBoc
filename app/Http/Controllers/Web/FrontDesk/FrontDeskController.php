<?php

namespace App\Http\Controllers\Web\FrontDesk;

use App\Http\Controllers\Controller;
use App\Models\FrontDeskRequest;
use App\Models\FrontDeskQueue;
use App\Models\FrontDeskAppointment;
use App\Models\FrontDeskClaimSlip;
use App\Models\TaxPayment;
use App\Models\Resident;
use App\Traits\SendsNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FrontDeskController extends Controller
{
    use SendsNotifications;

    // ============================================
    // REQUESTS
    // ============================================

    /**
     * Get all requests
     */
    public function getRequests(Request $request)
    {
        $query = FrontDeskRequest::with(['resident', 'processedBy', 'createdBy']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('service_type')) {
            $query->where('service_type', $request->service_type);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
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

        $requests = $query->latest()->paginate(15);

        return $this->respondSuccess($requests);
    }

    /**
     * Create request
     * ✅ Notifies resident their request has been created
     */
    public function createRequest(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resident_id' => 'required|exists:residents,id',
            'service_type' => 'required|string|max:255',
            'purpose' => 'nullable|string',
            'priority' => 'required|in:low,normal,high,urgent',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $frontDeskRequest = FrontDeskRequest::create([
            'resident_id' => $request->resident_id,
            'service_type' => $request->service_type,
            'purpose' => $request->purpose,
            'priority' => $request->priority,
            'reference_number' => $this->generateRequestNumber(),
            'status' => 'pending',
            'created_by_user_id' => Auth::id(),
        ]);

        // Add to queue automatically
        $this->addToQueueInternal($frontDeskRequest->id);

        // ✅ Notify resident
        $this->notifyResident(
            $frontDeskRequest,
            '📝 Service Request Created',
            "Your request for {$frontDeskRequest->service_type} ({$frontDeskRequest->reference_number}) has been created and queued.",
            'normal',
            '/resident/requests/' . $frontDeskRequest->id
        );

        return $this->respondSuccess(
            $frontDeskRequest->load('resident'),
            'Request created successfully',
            201
        );
    }

    /**
     * Get single request
     */
    public function getRequest($id)
    {
        $frontDeskRequest = FrontDeskRequest::with([
            'resident',
            'processedBy',
            'createdBy',
            'appointments',
            'claimSlip'
        ])->find($id);

        if (!$frontDeskRequest) {
            return $this->respondNotFound('Request not found');
        }

        return $this->respondSuccess($frontDeskRequest);
    }

    /**
     * Process request
     * ✅ Notifies resident their request is being processed
     */
    public function processRequest($id)
    {
        $frontDeskRequest = FrontDeskRequest::find($id);

        if (!$frontDeskRequest) {
            return $this->respondNotFound('Request not found');
        }

        if ($frontDeskRequest->status !== 'pending') {
            return $this->respondError('Only pending requests can be processed', null, 422);
        }

        $frontDeskRequest->update([
            'status' => 'processing',
            'processed_by_user_id' => Auth::id(),
            'processed_at' => now(),
        ]);

        $this->removeFromQueueInternal($frontDeskRequest->id);

        // ✅ Notify resident their request is being processed
        $this->notifyResident(
            $frontDeskRequest,
            '⏳ Request Being Processed',
            "Your request ({$frontDeskRequest->reference_number}) is now being processed.",
            'normal',
            '/resident/requests/' . $frontDeskRequest->id
        );

        return $this->respondSuccess($frontDeskRequest, 'Request is now being processed');
    }

    /**
     * Issue document
     * ✅ Notifies resident their document is ready
     */
    public function issueDocument($id)
    {
        $frontDeskRequest = FrontDeskRequest::find($id);

        if (!$frontDeskRequest) {
            return $this->respondNotFound('Request not found');
        }

        if ($frontDeskRequest->status !== 'processing') {
            return $this->respondError('Only processing requests can be issued', null, 422);
        }

        DB::beginTransaction();

        try {
            $frontDeskRequest->update([
                'status' => 'completed',
                'issued_at' => now(),
                'processed_by_user_id' => Auth::id(),
            ]);

            $claimSlip = FrontDeskClaimSlip::create([
                'request_id' => $frontDeskRequest->id,
                'resident_id' => $frontDeskRequest->resident_id,
                'reference_number' => $this->generateClaimSlipNumber(),
                'document_type' => $frontDeskRequest->service_type,
                'status' => 'pending',
                'issued_by_user_id' => Auth::id(),
                'issued_at' => now(),
            ]);

            DB::commit();

            // ✅ Notify resident
            $this->notifyResident(
                $frontDeskRequest,
                '✅ Document Ready for Pickup',
                "Your {$frontDeskRequest->service_type} is ready. Claim slip: {$claimSlip->reference_number}.",
                'high',
                '/resident/requests/' . $frontDeskRequest->id
            );

            return $this->respondSuccess([
                'request' => $frontDeskRequest,
                'claim_slip' => $claimSlip
            ], 'Document issued successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Issue document error: ' . $e->getMessage());
            return $this->respondError('Failed to issue document: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Forward request
     * ✅ Notifies resident their request was forwarded
     */
    public function forwardRequest(Request $request, $id)
    {
        $frontDeskRequest = FrontDeskRequest::find($id);

        if (!$frontDeskRequest) {
            return $this->respondNotFound('Request not found');
        }

        $validator = Validator::make($request->all(), [
            'office' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $frontDeskRequest->update([
            'status' => 'forwarded',
            'forwarded_to_office' => $request->office,
            'forwarded_notes' => $request->notes,
            'forwarded_by_user_id' => Auth::id(),
            'forwarded_at' => now(),
        ]);

        // ✅ Notify resident
        $this->notifyResident(
            $frontDeskRequest,
            '📤 Request Forwarded',
            "Your request ({$frontDeskRequest->reference_number}) has been forwarded to {$request->office}.",
            'normal',
            '/resident/requests/' . $frontDeskRequest->id
        );

        return $this->respondSuccess($frontDeskRequest, 'Request forwarded successfully');
    }

    /**
     * Cancel request
     * ✅ Notifies resident
     */
    public function cancelRequest($id)
    {
        $frontDeskRequest = FrontDeskRequest::find($id);

        if (!$frontDeskRequest) {
            return $this->respondNotFound('Request not found');
        }

        if ($frontDeskRequest->status === 'completed') {
            return $this->respondError('Completed requests cannot be cancelled', null, 422);
        }

        $frontDeskRequest->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
            'cancelled_by_user_id' => Auth::id(),
        ]);

        $this->removeFromQueueInternal($frontDeskRequest->id);

        // ✅ Notify resident
        $this->notifyResident(
            $frontDeskRequest,
            '❌ Request Cancelled',
            "Your request ({$frontDeskRequest->reference_number}) has been cancelled.",
            'normal',
            '/resident/requests/' . $frontDeskRequest->id
        );

        return $this->respondSuccess($frontDeskRequest, 'Request cancelled successfully');
    }

    // ============================================
    // QUEUE
    // ============================================

    public function getQueue(Request $request)
    {
        $query = FrontDeskQueue::with(['resident', 'request'])
            ->where(function ($q) {
                $q->where('status', 'waiting')
                    ->orWhere('status', 'serving');
            });

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('resident', function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%");
            });
        }

        $queue = $query->orderBy('position', 'asc')->get();

        return $this->respondSuccess($queue);
    }

    public function addToQueue(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resident_id' => 'required|exists:residents,id',
            'request_id' => 'nullable|exists:front_desk_requests,id',
            'service_type' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $result = $this->addToQueueInternal(
            $request->request_id,
            $request->resident_id,
            $request->service_type
        );

        return $this->respondSuccess($result, 'Added to queue successfully', 201);
    }

    private function addToQueueInternal($requestId = null, $residentId = null, $serviceType = null)
    {
        $data = [];

        if ($requestId) {
            $frontDeskRequest = FrontDeskRequest::find($requestId);
            if (!$frontDeskRequest) return null;
            $residentId = $frontDeskRequest->resident_id;
            $serviceType = $frontDeskRequest->service_type;
            $data['request_id'] = $requestId;
        }

        $existing = FrontDeskQueue::where('resident_id', $residentId)
            ->where('status', 'waiting')
            ->first();

        if ($existing) {
            if ($serviceType) {
                $existing->update(['service_type' => $serviceType]);
            }
            return $existing;
        }

        $maxPosition = FrontDeskQueue::max('position') ?? 0;

        $queue = FrontDeskQueue::create([
            'resident_id' => $residentId,
            'request_id' => $requestId,
            'service_type' => $serviceType,
            'position' => $maxPosition + 1,
            'status' => 'waiting',
            'joined_at' => now(),
        ]);

        return $queue;
    }

    public function callNext()
    {
        $nextInQueue = FrontDeskQueue::where('status', 'waiting')
            ->orderBy('position', 'asc')
            ->first();

        if (!$nextInQueue) {
            return $this->respondNotFound('No more in queue');
        }

        $nextInQueue->update([
            'status' => 'serving',
            'called_at' => now(),
        ]);

        // ✅ Notify resident that they're being called
        $user = $this->getUserByResidentId($nextInQueue->resident_id);
        if ($user) {
            $this->notifyUser(
                $user->id,
                '🔔 You Are Being Called',
                "It's your turn at the Front Desk. Please proceed to the counter.",
                'queue',
                'high',
                null,
                Auth::id(),
                'queue',
                $nextInQueue->id
            );
        }

        return $this->respondSuccess($nextInQueue->load('resident'), 'Next in line called');
    }

    public function removeFromQueue($id)
    {
        $result = $this->removeFromQueueInternal($id);
        return $this->respondSuccess($result, 'Removed from queue');
    }

    // ============================================
    // APPOINTMENTS
    // ============================================

    public function getAppointments(Request $request)
    {
        $query = FrontDeskAppointment::with(['resident', 'request']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date_from')) {
            $query->whereDate('appointment_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('appointment_date', '<=', $request->date_to);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('resident', function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%");
            });
        }

        $appointments = $query->orderBy('appointment_date', 'asc')->paginate(15);

        return $this->respondSuccess($appointments);
    }

    /**
     * Create appointment
     * ✅ Notifies resident of the scheduled appointment
     */
    public function createAppointment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'resident_id' => 'required|exists:residents,id',
            'request_id' => 'nullable|exists:front_desk_requests,id',
            'service_type' => 'required|string|max:255',
            'appointment_date' => 'required|date|after_or_equal:today',
            'appointment_time' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $appointment = FrontDeskAppointment::create([
            'resident_id' => $request->resident_id,
            'request_id' => $request->request_id,
            'service_type' => $request->service_type,
            'appointment_date' => $request->appointment_date,
            'appointment_time' => $request->appointment_time,
            'notes' => $request->notes,
            'reference_number' => $this->generateAppointmentNumber(),
            'status' => 'scheduled',
            'created_by_user_id' => Auth::id(),
        ]);

        // ✅ Notify resident
        try {
            $user = $this->getUserByResidentId($request->resident_id);
            if ($user) {
                $date = now()->parse($request->appointment_date)->format('F d, Y');
                $time = $request->appointment_time ?: 'during office hours';

                $this->notifyUser(
                    $user->id,
                    '📅 Appointment Scheduled',
                    "Your {$request->service_type} appointment is scheduled on {$date} at {$time}. Ref: {$appointment->reference_number}.",
                    'appointment',
                    'high',
                    null,
                    Auth::id(),
                    'appointment',
                    $appointment->id
                );
            }
        } catch (\Exception $e) {
            Log::error('Appointment notify error: ' . $e->getMessage());
        }

        return $this->respondSuccess(
            $appointment->load('resident'),
            'Appointment scheduled successfully',
            201
        );
    }

    public function updateAppointment(Request $request, $id)
    {
        $appointment = FrontDeskAppointment::find($id);

        if (!$appointment) {
            return $this->respondNotFound('Appointment not found');
        }

        $validator = Validator::make($request->all(), [
            'appointment_date' => 'sometimes|date|after_or_equal:today',
            'appointment_time' => 'nullable|string',
            'status' => 'sometimes|in:scheduled,confirmed,cancelled,completed',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $appointment->update($request->all());

        // ✅ Notify resident if date/time changed
        if ($request->has('appointment_date') || $request->has('appointment_time')) {
            try {
                $user = $this->getUserByResidentId($appointment->resident_id);
                if ($user) {
                    $date = now()->parse($appointment->appointment_date)->format('F d, Y');
                    $time = $appointment->appointment_time ?: 'during office hours';

                    $this->notifyUser(
                        $user->id,
                        '📅 Appointment Updated',
                        "Your appointment has been rescheduled to {$date} at {$time}.",
                        'appointment',
                        'high',
                        null,
                        Auth::id(),
                        'appointment',
                        $appointment->id
                    );
                }
            } catch (\Exception $e) {
                Log::error('Appointment update notify error: ' . $e->getMessage());
            }
        }

        return $this->respondSuccess($appointment, 'Appointment updated successfully');
    }

    public function cancelAppointment($id)
    {
        $appointment = FrontDeskAppointment::find($id);

        if (!$appointment) {
            return $this->respondNotFound('Appointment not found');
        }

        if ($appointment->status === 'completed') {
            return $this->respondError('Completed appointments cannot be cancelled', null, 422);
        }

        $appointment->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);

        // ✅ Notify resident
        try {
            $user = $this->getUserByResidentId($appointment->resident_id);
            if ($user) {
                $this->notifyUser(
                    $user->id,
                    '❌ Appointment Cancelled',
                    "Your appointment ({$appointment->reference_number}) has been cancelled.",
                    'appointment',
                    'normal',
                    null,
                    Auth::id(),
                    'appointment',
                    $appointment->id
                );
            }
        } catch (\Exception $e) {
            Log::error('Appointment cancel notify error: ' . $e->getMessage());
        }

        return $this->respondSuccess($appointment, 'Appointment cancelled successfully');
    }

    // ============================================
    // CLAIM SLIPS
    // ============================================

    public function getClaimSlips(Request $request)
    {
        $query = FrontDeskClaimSlip::with(['resident', 'request', 'issuedBy']);

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

        $claimSlips = $query->latest()->paginate(15);

        return $this->respondSuccess($claimSlips);
    }

    public function generateClaimSlip(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'request_id' => 'required|exists:front_desk_requests,id',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $frontDeskRequest = FrontDeskRequest::findOrFail($request->request_id);

        $existing = FrontDeskClaimSlip::where('request_id', $request->request_id)->first();
        if ($existing) {
            return $this->respondError('Claim slip already exists for this request', null, 422);
        }

        $claimSlip = FrontDeskClaimSlip::create([
            'request_id' => $request->request_id,
            'resident_id' => $frontDeskRequest->resident_id,
            'reference_number' => $this->generateClaimSlipNumber(),
            'document_type' => $frontDeskRequest->service_type,
            'status' => 'pending',
            'issued_by_user_id' => Auth::id(),
            'issued_at' => now(),
        ]);

        return $this->respondSuccess(
            $claimSlip->load(['resident', 'request']),
            'Claim slip generated successfully',
            201
        );
    }

    public function printClaimSlip($id)
    {
        $claimSlip = FrontDeskClaimSlip::with(['resident', 'request'])->find($id);

        if (!$claimSlip) {
            return $this->respondNotFound('Claim slip not found');
        }

        return $this->respondSuccess([
            'claim_slip' => $claimSlip,
            'resident_name' => $claimSlip->resident ? $claimSlip->resident->full_name : 'N/A',
            'document_type' => $claimSlip->document_type,
            'reference_number' => $claimSlip->reference_number,
            'issued_date' => $claimSlip->issued_at ? $claimSlip->issued_at->format('F d, Y') : 'N/A',
        ]);
    }

    public function markClaimed($id)
    {
        $claimSlip = FrontDeskClaimSlip::find($id);

        if (!$claimSlip) {
            return $this->respondNotFound('Claim slip not found');
        }

        if ($claimSlip->status === 'claimed') {
            return $this->respondError('This claim slip has already been claimed', null, 422);
        }

        $claimSlip->update([
            'status' => 'claimed',
            'claimed_at' => now(),
            'claimed_by_user_id' => Auth::id(),
        ]);

        return $this->respondSuccess($claimSlip, 'Document marked as claimed');
    }

    // ============================================
    // RESIDENTS
    // ============================================

    public function getResidents(Request $request)
    {
        $query = Resident::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'LIKE', "%{$search}%")
                    ->orWhere('last_name', 'LIKE', "%{$search}%")
                    ->orWhere('phone_number', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $residents = $query->orderBy('last_name')->paginate(15);

        return $this->respondSuccess($residents);
    }

    public function registerResident(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'suffix' => 'nullable|string|max:10',
            'phone_number' => 'nullable|string|max:20',
            'address' => 'required|string',
            'birth_date' => 'nullable|date',
            'gender' => 'required|in:Male,Female',
            'civil_status' => 'required|in:Single,Married,Widowed,Separated',
            'zone' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $resident = Resident::create($validator->validated());

        return $this->respondSuccess($resident, 'Resident registered successfully', 201);
    }

    public function getResident($id)
    {
        $resident = Resident::with(['households'])->find($id);

        if (!$resident) {
            return $this->respondNotFound('Resident not found');
        }

        return $this->respondSuccess($resident);
    }

    public function verifyResident($id)
    {
        $resident = Resident::find($id);

        if (!$resident) {
            return $this->respondNotFound('Resident not found');
        }

        $hasRecords = $resident->households()->exists();

        return $this->respondSuccess([
            'resident' => $resident,
            'has_existing_records' => $hasRecords,
            'verified' => true,
        ]);
    }

    // ============================================
    // TAX PAYMENTS (Front Desk)
    // ============================================

    public function getTaxPayments(Request $request)
    {
        $query = TaxPayment::with(['resident', 'processedBy']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('taxpayer_name', 'LIKE', "%{$search}%")
                    ->orWhere('receipt_number', 'LIKE', "%{$search}%");
            });
        }

        $taxPayments = $query->latest()->paginate(20);

        return $this->respondSuccess($taxPayments);
    }

    public function storeTaxPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'taxpayer_name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'tax_type' => 'required|in:Cedula,Real Property Tax,Business Tax',
            'payment_method' => 'required|in:Cash,GCash',
            'resident_id' => 'nullable|exists:residents,id',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->respondError('Validation error', $validator->errors(), 422);
        }

        $taxPayment = TaxPayment::create([
            'resident_id' => $request->resident_id,
            'processed_by_user_id' => Auth::id(),
            'receipt_number' => $this->generateTaxReceiptNumber(),
            'taxpayer_name' => $request->taxpayer_name,
            'tax_type' => $request->tax_type,
            'amount' => $request->amount,
            'payment_method' => $request->payment_method,
            'status' => 'paid',
            'paid_at' => now(),
            'remarks' => $request->remarks,
        ]);

        // ✅ Notify resident if linked
        if ($request->resident_id) {
            try {
                $user = $this->getUserByResidentId($request->resident_id);
                if ($user) {
                    $formattedAmount = '₱' . number_format($taxPayment->amount, 2);
                    $this->notifyUser(
                        $user->id,
                        '🧾 Tax Payment Recorded',
                        "Your {$taxPayment->tax_type} payment of {$formattedAmount} has been recorded. Receipt#: {$taxPayment->receipt_number}.",
                        'payment',
                        'normal',
                        null,
                        Auth::id(),
                        'tax_payment',
                        $taxPayment->id
                    );
                }
            } catch (\Exception $e) {
                Log::error('Tax notify error: ' . $e->getMessage());
            }
        }

        return $this->respondSuccess(
            $taxPayment->load(['resident', 'processedBy']),
            'Tax payment recorded successfully',
            201
        );
    }

    // ============================================
    // PRIVATE HELPERS
    // ============================================

    /**
     * ✅ Notify the resident associated with a front desk request
     */
    private function notifyResident(
        FrontDeskRequest $request,
        string $title,
        string $message,
        string $priority = 'normal',
        ?string $deepLink = null
    ): void {
        try {
            $user = $this->getUserByResidentId($request->resident_id);
            if (!$user) return;

            $this->notifyUser(
                $user->id,
                $title,
                $message,
                'front_desk',
                $priority,
                $deepLink,
                Auth::id(),
                'front_desk_request',
                $request->id
            );
        } catch (\Exception $e) {
            Log::error('Front desk notify resident error: ' . $e->getMessage());
        }
    }

    private function removeFromQueueInternal($id)
    {
        $queue = FrontDeskQueue::where('request_id', $id)->orWhere('id', $id)->first();

        if (!$queue) return null;

        $position = $queue->position;
        $queue->delete();

        FrontDeskQueue::where('position', '>', $position)->decrement('position');

        return $queue;
    }

    private function generateRequestNumber()
    {
        $prefix = 'REQ';
        $year = date('Y');
        $month = date('m');
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $number = "{$prefix}-{$year}{$month}-{$random}";

        while (FrontDeskRequest::where('reference_number', $number)->exists()) {
            $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $number = "{$prefix}-{$year}{$month}-{$random}";
        }

        return $number;
    }

    private function generateClaimSlipNumber()
    {
        $prefix = 'CLM';
        $year = date('Y');
        $month = date('m');
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $number = "{$prefix}-{$year}{$month}-{$random}";

        while (FrontDeskClaimSlip::where('reference_number', $number)->exists()) {
            $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $number = "{$prefix}-{$year}{$month}-{$random}";
        }

        return $number;
    }

    private function generateAppointmentNumber()
    {
        $prefix = 'APT';
        $year = date('Y');
        $month = date('m');
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $number = "{$prefix}-{$year}{$month}-{$random}";

        while (FrontDeskAppointment::where('reference_number', $number)->exists()) {
            $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $number = "{$prefix}-{$year}{$month}-{$random}";
        }

        return $number;
    }

    private function generateTaxReceiptNumber()
    {
        $year = date('Y');
        $month = date('m');
        $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $number = "TX-{$year}{$month}-{$random}";

        while (TaxPayment::where('receipt_number', $number)->exists()) {
            $random = str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            $number = "TX-{$year}{$month}-{$random}";
        }

        return $number;
    }
}
